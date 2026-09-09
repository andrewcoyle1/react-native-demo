/**
 * Layout for the signed-in app.
 *
 * Only mounted when the root gate in `src/app/_layout.tsx` says there is a user,
 * so every screen below it can assume one exists.
 */
import AppTabs from '@/components/app-tabs';

export default function MainLayout() {
  return <AppTabs />;
}
