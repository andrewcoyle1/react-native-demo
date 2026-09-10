# Change streaming

How the app learns that its data changed, without polling.

Three parts: a durable log written by database triggers, one Postgres
`LISTEN` connection that wakes the server, and one SSE stream per signed-in
device that fans changes out. The design exists to answer the four ways a naive
`LISTEN`/`NOTIFY` implementation loses data.

## Why not `NOTIFY` alone

`pg_notify` is fire-and-forget. Nothing is stored, nothing is replayed, and a
notification raised while no one is listening is simply gone. A server restart,
a backgrounded phone, a dropped socket — each loses every change that happened
during it, and the client has no way to discover what it missed. Payloads are
also capped at 8000 bytes, so the interesting data would not fit anyway.

So `NOTIFY` carries no data here. It carries a user id, meaning *"something of
theirs changed, go and look"*. The looking happens in a table.

## The change log

```sql
create table change_log (
  id          bigserial   primary key,
  user_id     uuid        not null references users(id) on delete cascade,
  resource    text        not null check (resource in
                ('profile', 'session', 'plan', 'race', 'schedule', 'activity')),
  resource_id uuid        not null,
  op          text        not null check (op in ('upsert', 'delete')),
  created_at  timestamptz not null default now()
);

-- The only query this table serves: everything newer than a client's cursor.
create index change_log_user_cursor_idx on change_log (user_id, id);
```

`bigserial` rather than a timestamp on purpose. `id` is monotonic within a
session and unique, which makes it a cursor a client can resume from exactly
once. Two changes in the same millisecond are still ordered.

### The trigger

One function, attached to every table with an argument naming the resource:

```sql
create function log_change() returns trigger as $$
declare
  target uuid;
begin
  target := coalesce(new.user_id, old.user_id);

  insert into change_log (user_id, resource, resource_id, op)
  values (
    target,
    tg_argv[0],
    coalesce(new.id, old.id),
    case when tg_op = 'DELETE' then 'delete' else 'upsert' end
  );

  -- A nudge, not the data. Delivered on commit, never for a rolled-back write.
  perform pg_notify('changes', target::text);

  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger sessions_change
  after insert or update or delete on sessions
  for each row execute function log_change('session');
```

Two properties worth naming. Postgres delivers notifications **at commit**, so a
transaction that rolls back raises nothing — the log and the notification cannot
disagree with the data. And because the insert into `change_log` is part of the
same transaction as the write, a change is logged if and only if it happened.

### Retention

The log defines how long a device may be away and still resume:

```sql
delete from change_log where created_at < now() - interval '7 days';
```

A client returning with a cursor older than that cannot be caught up
incrementally, and the server says so rather than silently skipping — see
`reset` below.

## The stream

```
GET /v1/stream
Authorization: Bearer <access token>
Last-Event-ID: 41982            (optional; resumes from just after this)
```

Server-Sent Events rather than a WebSocket, for one reason that matters more
than the rest: `Last-Event-ID` is part of the protocol. Reconnection with a
resume cursor is the behaviour we would otherwise have to design, test and get
wrong. The stream is one-directional — the client never pushes over it, it
writes over ordinary REST — so a bidirectional transport buys nothing.

React Native has no `EventSource`; it needs a small library. That is the cost,
and it is worth it.

### Events

```
event: change
id: 41983
data: {"resource":"session","op":"upsert","id":"…","payload":{…SessionDTO}}

event: heartbeat
data: {}

event: reset
data: {"reason":"cursor_too_old"}
```

- **`change`** carries the whole DTO on an upsert, not just an id. SSE has no
  8000-byte limit — that was `pg_notify`'s — so the client applies the change
  without a follow-up fetch. A delete carries only the id.
- **`heartbeat`** every 30 seconds, because idle connections are killed by
  proxies and by iOS, and a silent dead socket is worse than a closed one.
- **`reset`** means *"I cannot catch you up"* — the cursor predates retention, or
  the account changed underneath. The client discards its cache, refetches the
  snapshot, and resumes from the cursor that comes with it. This is the event
  that keeps a stale client from believing a partial picture.

### Snapshot, then stream

The stream carries *changes*, never initial state. A subscriber:

1. `GET`s the resource over REST as it does today, which returns a cursor
   alongside the data.
2. Opens (or joins) the stream with that cursor.
3. Applies deltas from there.

**The REST endpoints in `docs/api.md` are unchanged and remain the source of
initial state.** Streaming is added on top of them, not instead of them. It is
also the fallback: if the stream cannot connect, refetching on focus is still
correct, just less immediate.

### One stream, every resource

A device opens **one** connection carrying changes to all of its resources,
demultiplexed on the client by `resource`. Not one per provider — six sockets
per device, six registry entries, six reconnects on every foreground.

Fan-out is far simpler here than in Firestore, and worth appreciating: every
row belongs to exactly one athlete, so the subscription unit is the user. There
is no per-query fan-out to maintain, because there are no shared documents and
no queries spanning users.

### Server shape

```
one dedicated pg client, outside the pool ──LISTEN changes──┐
                                                            │
             notification { userId }  ─────────────────────►│
                                                            ▼
                              connections registry: userId → [stream, cursor]
                                                            │
                    for each: select … from change_log      │
                              where user_id = $1 and id > $2
                              order by id
                                          hydrate DTOs, emit, advance cursor
```

The `LISTEN` connection must be a dedicated long-lived client, never one checked
out of the pool: a pooled connection is returned between queries and stops
listening.

With more than one server process, each holds its own `LISTEN` connection and
its own registry, and every process is notified — so a client connected to any
of them is served. That works unchanged up to the point where the notification
volume itself becomes the problem, which is a long way off.

### Auth

The access token lives 15 minutes; the stream wants to live longer. Rather than
re-authenticating mid-connection, the server closes the stream when the token
expires and the client reconnects with a fresh one.

This is cheap precisely because resume exists: reconnection replays only what
was missed, so a token-expiry disconnect costs one round trip and no data. The
single-flight refresh rule in `docs/api.md` applies — a stream reconnect must
queue behind an in-flight refresh like any other request.

## What this does not solve

**Offline writes still need a queue.** Streaming is about reads. A session marked
complete in a pool with no signal still fails, and still needs the pending-write
queue from the data-manager port to survive and retry. Idempotency keys on
writes matter more, not less, once a queue can retry them.

**Backgrounded apps do not receive events.** iOS suspends the connection. For
anything that must reach the athlete while the app is closed — a Garmin activity
syncing, a plan regenerating — the answer is a push notification, not this.

## Consequences for the app

The one that matters: **writes get their echo back**. Marking a session complete
writes over REST, the trigger logs it, the stream delivers it, and the tick
appears without the provider refetching — the Firestore behaviour the earlier
fetch-only design would have lost.

`useRemoteSubscription` needs no change at all. Its `subscribe(key, onData,
onError) => unsubscribe` shape was always stream-shaped: `onData` may fire many
times. What changes is inside the service, which now holds the current window,
applies each delta to it, and re-emits the whole array.

That accumulating-state-per-window job is precisely what a `CollectionSyncEngine`
does in SwiftfulDataManagers, and it is where the port should land — between the
providers and the services, owning the cache, the delta application and the
pending writes.
