import { router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type TextInput } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { Card, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useNotes, type Note } from '@/providers/notes-provider';
import { reportError, trackEvent } from '@/services/telemetry';

export default function PlanScreen() {
  useScreenTracking('Notes');

  const { state, add, remove } = useNotes();
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const draftRef = useRef<TextInput>(null);

  if (state.status === 'signedOut') {
    return (
      <Screen title="Plan" subtitle="Free trial">
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            Sign in on the Account tab to read and write notes. Each user only sees
            documents under `users/{'{uid}'}/notes`.
          </ThemedText>
        </Card>
      </Screen>
    );
  }

  async function handleAdd() {
    const text = draft.trim();
    if (!text) {
      return;
    }

    setSaving(true);
    setActionError(null);
    try {
      await add(text);
      setDraft('');
      trackEvent('note_added', { length: text.length });
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Could not save the note.');
      reportError(caught, 'notes: add');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(noteId: string) {
    setActionError(null);
    try {
      await remove(noteId);
      trackEvent('note_deleted');
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Could not delete the note.');
      reportError(caught, 'notes: remove');
    }
  }

  return (
    <Screen>
          <Stack.Toolbar placement="right">
            {/* Items sit horizontally in the header's trailing area, in source order. */}
            <Stack.Toolbar.Button icon="questionmark.bubble" onPress={() => router.push('/modal')} />
            <Stack.Toolbar.Button
              icon="bell"
              onPress={() => router.push('/sheet')}
            />
            <Stack.Toolbar.Button
              icon="person.crop.circle"
              onPress={() => router.push('/account')}
            />

          </Stack.Toolbar>

      <Card title="New note">
        <ThemedTextInput
          ref={draftRef}
          value={draft}
          onChangeText={setDraft}
          placeholder="Write something…"
          multiline
          style={styles.draftInput}
          onSubmitEditing={handleAdd}
        />
        <ActionButton title="Add note" busy={saving} disabled={!draft.trim()} onPress={handleAdd} />
      </Card>

      {actionError ? <ErrorText message={actionError} /> : null}

      <NotesBody state={state} onDelete={handleDelete} />
    </Screen>
  );
}

/**
 * Renders whichever state the list is in. The union means there is no way to
 * reach a combination the UI has not accounted for — the compiler checks it.
 */
function NotesBody({
  state,
  onDelete,
}: {
  state: Exclude<ReturnType<typeof useNotes>['state'], { status: 'signedOut' }>;
  onDelete: (noteId: string) => void;
}) {
  switch (state.status) {
    case 'loading':
      return <ActivityIndicator style={styles.loading} />;

    case 'error':
      return <ErrorText message={state.message} />;

    case 'ready':
      if (state.notes.length === 0) {
        return (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              No notes yet. Add one above and it will appear here without a refresh —
              the live listener pushes the change.
            </ThemedText>
          </Card>
        );
      }
      return (
        <Card title={`${state.notes.length} note${state.notes.length === 1 ? '' : 's'}`}>
          {state.notes.map(note => (
            <NoteRow key={note.id} note={note} onDelete={() => onDelete(note.id)} />
          ))}
        </Card>
      );
  }
}

function ErrorText({ message }: { message: string }) {
  return (
    <ThemedText type="small" style={styles.error} accessibilityRole="alert">
      {message}
    </ThemedText>
  );
}

function NoteRow({ note, onDelete }: { note: Note; onDelete: () => void }) {
  return (
    <ThemedView type="backgroundSelected" style={styles.noteRow}>
      <ThemedView type="backgroundSelected" style={styles.noteBody}>
        <ThemedText>{note.text}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {note.createdAt ? note.createdAt.toLocaleString() : 'Saving…'}
        </ThemedText>
      </ThemedView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete note: ${note.text}`}
        hitSlop={Spacing.two}
        onPress={onDelete}
        style={({ pressed }) => pressed && styles.pressed}>
        <ThemedText type="smallBold" style={styles.deleteLabel}>
          Delete
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  draftInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  loading: {
    paddingVertical: Spacing.four,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  noteBody: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  deleteLabel: {
    color: '#e5484d',
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: '#e5484d',
  },
});
