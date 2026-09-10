/**
 * There is no Firestore implementation of `TrendsService`, and this file exists
 * to say so rather than to leave a gap someone fills in badly.
 *
 * Every figure on the Trends screen is an aggregate: sums over a window, and
 * exponentially weighted averages across months of daily training load.
 * Firestore has no `group by` and no window functions, so the only way to
 * produce them from it is to download every session and activity the athlete
 * has ever recorded and reduce them on the phone — which is slow, expensive,
 * and gets worse the longer someone trains.
 *
 * So this reports honestly instead of inventing numbers. It is the one slice
 * that could not be built on the old backend, and the clearest single argument
 * for the move to Postgres.
 */
import type { TrendsService } from './trends-service';

export const firebaseTrendsService: TrendsService = {
  subscribe(_uid, _window, _onTrends, onError) {
    const timer = setTimeout(
      () =>
        onError(
          new Error(
            'Trends are computed by the Stamina API. Run the app with EXPO_PUBLIC_APP_ENV=api.',
          ),
        ),
      0,
    );

    return () => clearTimeout(timer);
  },
};
