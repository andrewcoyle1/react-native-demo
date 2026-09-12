# Deploying the API

The Stamina API runs on a DigitalOcean droplet in London, behind Caddy.

| | |
|---|---|
| Public URL | `https://46-101-9-200.sslip.io` |
| Droplet | `46.101.9.200` — Ubuntu 24.04, 1 vCPU, 1 GB |
| Private (VPC) address | `10.106.0.2` — reachable only from inside the VPC |
| Code | `/opt/stamina/api`, owned by the `stamina` system user |
| Secrets | `/etc/stamina/api.env`, mode 0640, `root:stamina` |
| Service | `systemctl {status,restart} stamina-api` |
| Logs | `journalctl -u stamina-api -f`, and `/var/log/caddy/api.log` |

## Why `sslip.io` and not the bare IP

Let's Encrypt will not issue a certificate for an IP address. `sslip.io` is a
public wildcard resolver: `46-101-9-200.sslip.io` resolves to `46.101.9.200`,
which is a *name*, so ACME can validate it. Nothing about the app depends on
sslip.io at runtime — it is DNS only, resolved once per lookup.

Moving to a real domain is a one-line change to the host block at the top of
`/etc/caddy/Caddyfile` plus `systemctl reload caddy`; Caddy fetches the new
certificate itself. Update `start:vps` in `package.json` to match.

## The shape of it

```
phone ──HTTPS/443──> Caddy ──HTTP──> 127.0.0.1:4000 (API) ──> 127.0.0.1:5432 (Postgres)
```

Only 22, 80 and 443 are open (`ufw status`). The API binds to loopback via
`HOST=127.0.0.1`, so even if a firewall rule were lost, port 4000 is not served
to the internet. Postgres has `listen_addresses = localhost` and is not exposed
at all.

`TRUST_PROXY=true` is set because Caddy is in front. Without it every client
shares one rate-limit bucket at the proxy's address and the auth limiter in
`server/src/config.ts` stops protecting anything.

## Swap

The droplet has 1 GB of RAM and runs Postgres, Node and Caddy together, so it
has a 2 GB swap file at `/swapfile` with `vm.swappiness=10` — swap as a safety
net rather than something the kernel reaches for routinely. Without it the first
memory spike gets something OOM-killed, and the kernel tends to pick Postgres.

The API unit also caps itself (`MemoryMax=420M`, `--max-old-space-size=320`) so
a leak in the API cannot take the database with it. systemd restarts the API; an
OOM-killed Postgres needs a human.

## Pointing the app at it

```sh
npm run start:vps
```

That is `EXPO_PUBLIC_APP_ENV=api` plus `EXPO_PUBLIC_API_URL`. Both are inlined by
Metro at bundle time, not read at runtime, so changing either means restarting
the dev server — which is why the script passes `--clear`.

## Deploying a change

```sh
cd server
rsync -az --delete \
  --exclude node_modules/ --exclude .env --exclude .git/ \
  --exclude docker-compose.yml --exclude initdb/ \
  ./ root@46.101.9.200:/opt/stamina/api/
ssh root@46.101.9.200 '
  cd /opt/stamina/api && npm ci --omit=dev &&
  chown -R stamina:stamina /opt/stamina &&
  systemctl restart stamina-api'
```

Migrations run on boot (`server/src/index.ts`), so a restart applies any new
`.sql` files in `migrations/`. That is fine for one instance and becomes a race
with more than one — at that point migration moves to its own release step.

`docker-compose.yml` and `initdb/` are deliberately excluded: they are the local
development database (password `stamina`, port 5433) and have no business on a
public host. The droplet runs Postgres natively with a generated password.

## Gotcha: `caddy validate` as root

Running `caddy validate` as root provisions the config, which creates
`/var/log/caddy/api.log` owned by `root`. The service then runs as `caddy` and
fails to start with `permission denied`. Either validate as the `caddy` user or
`chown -R caddy:caddy /var/log/caddy` afterwards.
