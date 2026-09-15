/**
 * Why the athlete is in the personalisation flow.
 *
 * Normally they are there because they have no profile yet, and the root gate
 * works that out for itself from `UserProvider`. Adding a plan is the other
 * reason: an established athlete deliberately walking the same screens again
 * to build a second plan. The gate cannot infer that — from its point of view
 * they are a fully onboarded athlete who belongs in the tabs — so the intent
 * has to be stated.
 *
 * It lives above the navigator because the gate is above the navigator. It is
 * deliberately *not* in `device-preferences`: that holds what belongs to the
 * install and survives a restart, and this is the opposite — a single trip
 * through a flow, which an app relaunch should abandon rather than resume.
 */
import { createContext, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import type { SetupMode } from '@/app/(setup)/flow-order';

type SetupIntentValue = {
  mode: SetupMode;
  /** True while an athlete who already has a profile is adding another plan. */
  addingPlan: boolean;
  startAddingPlan: () => void;
  /** Called when the flow finishes or is abandoned. */
  stopAddingPlan: () => void;
};

const SetupIntentContext = createContext<SetupIntentValue | null>(null);

export function SetupIntentProvider({ children }: PropsWithChildren) {
  const [addingPlan, setAddingPlan] = useState(false);

  const value = useMemo<SetupIntentValue>(
    () => ({
      mode: addingPlan ? 'add-plan' : 'onboarding',
      addingPlan,
      startAddingPlan: () => setAddingPlan(true),
      stopAddingPlan: () => setAddingPlan(false),
    }),
    [addingPlan],
  );

  return <SetupIntentContext.Provider value={value}>{children}</SetupIntentContext.Provider>;
}

export function useSetupIntent(): SetupIntentValue {
  const value = useContext(SetupIntentContext);
  if (!value) {
    throw new Error('useSetupIntent must be used inside SetupIntentProvider');
  }
  return value;
}
