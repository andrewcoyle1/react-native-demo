/**
 * Preferences that belong to this install rather than to the athlete.
 *
 * There is exactly one today — `alternateUi`, the switch in Profile that swaps
 * the Dashboard and Profile tabs for their gluestack-ui builds — and the shape
 * is deliberately kept to that. Anything the account owns belongs in `settings-provider`,
 * behind its service seam and its four implementations.
 *
 * Neither existing store was the right home:
 *
 * - `localSettingsStore` is module-level and says so in its own header. It
 *   survives navigation and nothing else, which is honest for a value waiting
 *   on a schema but wrong for a preference someone sets once.
 * - `shared/persistence.ts` writes to `Paths.cache`, and opens by saying
 *   nothing in it is a source of truth. The OS may evict it whenever storage
 *   runs low, and a UI choice silently reverting after a low-disk evening is
 *   not a behaviour worth shipping.
 *
 * So this writes to `Paths.document`, which is the directory the OS is not
 * allowed to reclaim. One small JSON file, read once at launch.
 */
import { Directory, File, Paths } from 'expo-file-system';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { reportError } from '@/services/telemetry';

const DIRECTORY = 'device-preferences';
const FILENAME = 'preferences.json';

export type DevicePreferences = {
  /** Swaps the Dashboard and Profile tabs for the gluestack-ui builds of them. */
  alternateUi: boolean;
};

const defaults: DevicePreferences = {
  alternateUi: false,
};

type DevicePreferencesValue = DevicePreferences & {
  /**
   * False until the file has been read.
   *
   * Screens use it to hold the first paint rather than to show a spinner: a
   * tab that renders the standard UI and then swaps to the alternate one a
   * frame later reads as a glitch, not as a preference being applied.
   */
  ready: boolean;
  setAlternateUi: (value: boolean) => void;
};

const DevicePreferencesContext = createContext<DevicePreferencesValue | null>(null);

function file(): File {
  return new File(new Directory(Paths.document, DIRECTORY), FILENAME);
}

async function read(): Promise<DevicePreferences> {
  try {
    const target = file();
    if (!target.exists) {
      return defaults;
    }

    const parsed: unknown = JSON.parse(await target.text());
    if (typeof parsed !== 'object' || parsed === null) {
      return defaults;
    }

    // Read field by field rather than spreading the parsed object over the
    // defaults: this file was written by an older build as easily as by this
    // one, and a stale key must not become part of the value.
    const record = parsed as Record<string, unknown>;
    return {
      alternateUi:
        typeof record.alternateUi === 'boolean' ? record.alternateUi : defaults.alternateUi,
    };
  } catch {
    // Missing, corrupt, or unreadable all mean the same thing here: nobody has
    // set a preference on this device yet.
    return defaults;
  }
}

function write(value: DevicePreferences): void {
  try {
    const target = file();
    const parent = new Directory(Paths.document, DIRECTORY);
    if (!parent.exists) {
      parent.create({ intermediates: true });
    }
    target.write(JSON.stringify(value));
  } catch (caught) {
    // The switch has already flipped in memory, so the UI is correct for this
    // launch and only the persistence is lost. Worth reporting, not worth
    // failing the interaction over.
    reportError(caught, 'devicePreferences: write');
  }
}

export function DevicePreferencesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DevicePreferences>(defaults);
  const [ready, setReady] = useState(false);

  // Guards the write below. Without it the first render's `useEffect` would
  // write the defaults straight back over a file that has not been read yet.
  const loaded = useRef(false);

  useEffect(() => {
    let active = true;

    read().then(value => {
      if (!active) {
        return;
      }
      loaded.current = true;
      setState(value);
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  const setAlternateUi = useCallback((alternateUi: boolean) => {
    setState(current => ({ ...current, alternateUi }));
  }, []);

  // Persisted from an effect rather than from inside the setter: the updater
  // passed to `setState` has to stay pure, and StrictMode calls it twice.
  useEffect(() => {
    if (!loaded.current) {
      return;
    }
    write(state);
  }, [state]);

  const value = useMemo(
    () => ({ ...state, ready, setAlternateUi }),
    [state, ready, setAlternateUi],
  );

  return (
    <DevicePreferencesContext.Provider value={value}>
      {children}
    </DevicePreferencesContext.Provider>
  );
}

export function useDevicePreferences(): DevicePreferencesValue {
  const value = useContext(DevicePreferencesContext);

  if (!value) {
    throw new Error('useDevicePreferences must be used within a DevicePreferencesProvider');
  }

  return value;
}
