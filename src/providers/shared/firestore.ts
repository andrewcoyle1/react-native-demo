/**
 * Field readers for Firestore converters.
 *
 * The repo's rule is that a converter rejects rather than fabricates: a
 * half-written document becomes `null` and is dropped, never a model carrying an
 * invented date. Each reader below returns `undefined` when the field is missing
 * or the wrong type, so a converter can test the values it needs and bail once.
 *
 * Kept free of the rest of the app: no telemetry import, because the service
 * layer must not close an import cycle back through the facade.
 */
import { Timestamp } from '@react-native-firebase/firestore';

/** A document's data, before anything has been proven about it. */
export type RawData = Record<string, unknown> | undefined;

export function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function readNumber(value: unknown): number | undefined {
  // Number.isFinite rejects NaN and the infinities, which Firestore will store
  // happily and which would otherwise reach a chart as a broken bar.
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export function readDate(value: unknown): Date | undefined {
  return value instanceof Timestamp ? value.toDate() : undefined;
}

/** One of a known set of strings — the shape every domain union takes on disk. */
export function readEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

/** An array of strings, with anything that is not a string dropped. */
export function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** An array of enum members, with anything unrecognised dropped. */
export function readEnumArray<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  return readStringArray(value).filter((item): item is T => (allowed as readonly string[]).includes(item));
}

/**
 * Maps an array field through a converter, dropping the entries it rejects.
 *
 * Used for the nested records a session or activity carries — segments, route
 * points — where one bad entry should cost that entry rather than the document.
 */
export function readArray<T>(value: unknown, convert: (entry: RawData) => T | null): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(entry => (typeof entry === 'object' && entry !== null ? convert(entry as Record<string, unknown>) : null))
    .filter((entry): entry is T => entry !== null);
}

/** A nested map field, or undefined when it is absent or not a map. */
export function readMap(value: unknown): RawData {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** `'YYYY-MM-DD'`, the form a session's calendar day takes on disk. */
export function readDateKey(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}
