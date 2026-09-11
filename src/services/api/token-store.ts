/**
 * Where the session lives between launches.
 *
 * The refresh token is a bearer credential with a thirty-day life: whoever holds
 * it can mint access tokens. It goes in the Keychain, never in AsyncStorage,
 * which is a plain file readable on a jailbroken or backed-up device.
 *
 * The access token is deliberately *not* stored. It lasts fifteen minutes, so
 * persisting it buys one saved round trip in exchange for a second copy of a
 * credential on disk.
 */
import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'stamina.refreshToken';

export async function readRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    // A Keychain that cannot be read is indistinguishable from being signed
    // out, and is far better handled as such than by crashing on launch.
    return null;
  }
}

export async function writeRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
    // Available after first unlock, so a background refresh works while the
    // phone is locked, but nothing is readable before the first unlock.
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

export async function clearRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    // Already gone is the outcome we wanted.
  }
}
