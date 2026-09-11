/**
 * Where cached documents live between launches.
 *
 * The counterpart to `FileManagerDocumentPersistence` in SwiftfulDataManagers:
 * one JSON file per cached key, written whole, read whole. Files rather than a
 * key-value store because these are documents — a week of sessions, a set of
 * plans — that are always used in their entirety.
 *
 * Nothing here is a source of truth. Every value is a copy of something the
 * server owns, so a read that fails is a cache miss and never an error worth
 * showing anyone.
 */
import { Directory, File, Paths } from 'expo-file-system';

/** Kept apart from anything else the app writes, so it can be cleared wholesale. */
const CACHE_DIRECTORY = 'sync-cache';

function directory(): Directory {
  return new Directory(Paths.cache, CACHE_DIRECTORY);
}

/** Cache keys become filenames, so anything path-like has to go. */
function fileFor(key: string): File {
  return new File(directory(), `${key.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`);
}

function ensureDirectory(): void {
  const target = directory();
  if (!target.exists) {
    target.create({ intermediates: true });
  }
}

/**
 * What was cached under `key`, or null.
 *
 * The value is returned raw: JSON has no `Date`, so restoring a model's shape
 * is the caller's job, and only the caller knows which fields were dates.
 */
export async function readCache(key: string): Promise<unknown | null> {
  try {
    const file = fileFor(key);
    if (!file.exists) {
      return null;
    }
    return JSON.parse(await file.text()) as unknown;
  } catch {
    // Corrupt, unreadable, or the cache directory was evicted by the OS. All
    // three mean the same thing: there is nothing usable here.
    return null;
  }
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  try {
    ensureDirectory();
    fileFor(key).write(JSON.stringify(value));
  } catch {
    // A cache that cannot be written costs a network round trip next launch.
    // It is never worth failing a request over.
  }
}

export async function clearCache(): Promise<void> {
  try {
    const target = directory();
    if (target.exists) {
      target.delete();
    }
  } catch {
    // Nothing to do: the next write recreates it.
  }
}
