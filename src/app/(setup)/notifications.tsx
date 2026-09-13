/**
 * "Stay on track" — the single push-notification permission row.
 *
 * Not yet backed by `expo-notifications`: enabling flips local state rather
 * than requesting the real OS permission, which is the next thing to wire up
 * here alongside the connect-apps OAuth flows.
 */
import { router } from 'expo-router';
import { Icon } from '@/components/icon';

import { OnboardingStep } from '@/components/onboarding-step';
import { StatusRow } from '@/components/onboarding/status-row';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';

export default function NotificationsScreen() {
  useScreenTracking('Notifications');
  const { answers, update } = useOnboardingFlow();

  return (
    <OnboardingStep
      title="Stay on track"
      subtitle="Enable notifications to receive training reminders and updates"
      progress={stepProgress('notifications', true)}
      onNext={() => router.push('/plan-overview')}>
      <StatusRow
        icon={<Icon name="bell.fill" size={20} tintColor="#E5B93F" />}
        label="Enable Push Notifications"
        description="Get notified when planned workouts are completed"
        connected={answers.notificationsEnabled}
        connectedLabel="Enabled"
        disconnectedLabel="Disabled"
        onPress={() => update({ notificationsEnabled: !answers.notificationsEnabled })}
      />
    </OnboardingStep>
  );
}
