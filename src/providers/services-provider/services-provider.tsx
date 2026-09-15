/**
 * Carries the composition root's output down the tree.
 *
 * Providers below this one take the service they need as a prop, which is the
 * pattern that was already here and is worth keeping — a provider that reaches
 * for a global cannot be mounted twice with different backing. What changes is
 * where the layouts get those services from: this context rather than a module
 * import, so the container is chosen once, by the root, and everything below
 * receives it.
 *
 * Deliberately holds the whole `Services` object rather than a slice per
 * consumer. TypeScript has no equivalent of narrowing by conformance, and the
 * honest alternative — `Pick<Services, 'training'>` at each call site — is worth
 * adding as a convention later rather than inventing a second seam now.
 */
import { createContext, useContext, type ReactNode } from 'react';

import type { Services } from '@/services/container';

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({
  services,
  children,
}: {
  services: Services;
  children: ReactNode;
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

/**
 * Throws rather than falling back to a default container. A missing provider is
 * a wiring mistake, and the failure mode of a silent fallback here would be an
 * app quietly running against the wrong backend.
 */
export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('useServices must be used within ServicesProvider');
  }
  return services;
}
