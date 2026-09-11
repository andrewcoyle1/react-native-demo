/**
 * The Profile tab, rebuilt on gluestack-ui.
 *
 * This exists to answer one question — what does this product look like built
 * on a component library instead of on `StyleSheet` — so it is deliberately a
 * different *construction* of the same screen rather than a different screen.
 * Same information, same order, same destinations. What changes is how it is
 * assembled:
 *
 * - Sections are one `Card` with `Divider`s between rows, rather than the
 *   standard UI's run of separately-bordered row cards.
 * - Values sit opposite their label on one line, rather than stacked beneath
 *   it as a subtitle. It fits more on a screen and reads more like a table.
 * - Every colour, size and space is a Tailwind class resolving to a semantic
 *   token, rather than a `theme.*` lookup and a `StyleSheet` entry.
 *
 * It is presentational only. Every piece of data and every handler arrives as
 * a prop from `app/(main)/profile/index.tsx`, which owns the state for both
 * builds — so the two can never disagree about what the athlete's FTP is, and
 * this file has nothing to keep in sync.
 *
 * Styling rules, per the gluestack-ui v5 skill: semantic tokens only — no
 * `neutral-*`, no numbered colours — component props before `className`, and
 * the spacing scale rather than arbitrary pixel values. The one deliberate
 * exception is the socials row, which keeps its brand gradients: those are
 * brand artwork and are no more themeable here than in the standard build.
 */
import type { Href } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon, ChevronDownIcon, ChevronRightIcon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/* The app's own SF Symbol renderer, not gluestack's icon set: the socials row
   draws brand marks, and gluestack's set has no Instagram or Strava glyph to
   reach for. Aliased because `Icon` is already taken above. */
import { Icon as SymbolIcon } from '@/components/icon';

import { BottomTabInset } from '@/constants/theme';

/** One line of a section card. */
export type AltRow = {
  label: string;
  /** The figure or state opposite the label. */
  value: string;
  /** A third line under both — "Last synced: …". */
  caption?: string;
  /** Draws the value in the accent rather than muted. "Connected" does. */
  emphasis?: boolean;
  /** Omit on rows that do not lead anywhere; the chevron goes with it. */
  href?: Href;
};

export type AltProfileModel = {
  name: string;
  email: string | null;
  version: string;
  race: { name: string; place: string; date: string; target: string } | null;
  metrics: AltRow[];
  preferences: AltRow[];
  integrations: AltRow[];
  subscription: AltRow[];
  notifications: AltRow[];
  alternateUi: boolean;
  onAlternateUiChange: (value: boolean) => void;
  signOutPending: boolean;
  onSignOut: () => void;
  error: string | null;
  danger: {
    open: boolean;
    onToggle: () => void;
    resetPending: boolean;
    deletePending: boolean;
    onReset: () => void;
    onDelete: () => void;
    error: string | null;
  };
  socials: { id: string; label: string; url: string; gradient: string; icon: SFSymbol }[];
  onOpen: (url: string) => void;
  onNavigate: (href: Href) => void;
};

export function AltProfileScreen({ model }: { model: AltProfileModel }) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pt-6 gap-6"
      contentInsetAdjustmentBehavior="automatic">
      <Hero model={model} />

      <Section title="Fitness metrics" rows={model.metrics} onNavigate={model.onNavigate} />
      <Section title="Preferences" rows={model.preferences} onNavigate={model.onNavigate} />
      <Section
        title="Connected apps & devices"
        rows={model.integrations}
        onNavigate={model.onNavigate}
      />
      <Section
        title="Manage subscription"
        rows={model.subscription}
        onNavigate={model.onNavigate}
      />
      <Section title="Notifications" rows={model.notifications} onNavigate={model.onNavigate} />

      {/* The switch that got you here, and the only way back. Kept in both
          builds and worded identically in both, so it is never ambiguous which
          way the setting is pointing. */}
      <VStack space="sm">
        <SectionLabel>Appearance</SectionLabel>
        <Card size="sm">
          <HStack className="items-center justify-between gap-4">
            <VStack className="flex-1">
              <Text className="text-foreground font-medium">Alternate UI</Text>
              <Text size="sm" className="text-muted-foreground">
                Dashboard and Profile rebuilt on gluestack-ui
              </Text>
            </VStack>
            <Switch value={model.alternateUi} onValueChange={model.onAlternateUiChange} />
          </HStack>
        </Card>
      </VStack>

      <VStack space="sm">
        <SectionLabel>Account</SectionLabel>
        <Button
          variant="outline"
          onPress={model.signOutPending ? undefined : model.onSignOut}
          isDisabled={model.signOutPending}>
          <ButtonText>{model.signOutPending ? 'Signing out…' : 'Log Out'}</ButtonText>
        </Button>
        {model.error ? <ErrorText>{model.error}</ErrorText> : null}
      </VStack>

      <HStack className="justify-between">
        {model.socials.map(social => (
          <Pressable
            key={social.id}
            onPress={() => model.onOpen(social.url)}
            accessibilityRole="link"
            accessibilityLabel={social.label}
            className="size-13 items-center justify-center rounded-xl"
            /* Brand gradients, so not tokenised — see the header. There is no
               spacing-scale step at 52, which is the size the standard build
               draws these at; matching it is worth the one arbitrary value. */
            style={{ experimental_backgroundImage: social.gradient }}>
            <SymbolIcon name={social.icon} size={20} tintColor="#FFFFFF" />
          </Pressable>
        ))}
      </HStack>

      <VStack space="sm" className="items-center">
        <Pressable onPress={() => model.onOpen('https://example.com/terms')}>
          <Text className="text-primary">Terms &amp; Conditions</Text>
        </Pressable>
        <Pressable onPress={() => model.onOpen('https://example.com/privacy')}>
          <Text className="text-primary">Privacy Policy</Text>
        </Pressable>
        <Text size="2xs" className="text-muted-foreground tracking-widest">
          STAMINA TECHNOLOGIES LIMITED
        </Text>
        <Text size="2xs" className="text-muted-foreground">
          v{model.version}
        </Text>
      </VStack>

      <Danger danger={model.danger} />

      {/* The tab bar floats over the scroller, so the last card needs room to
          clear it. A spacer rather than a `contentContainerStyle` alongside the
          `contentContainerClassName` above: NativeWind maps the className onto
          that same prop, and one mechanism per prop leaves nothing to reason
          about. `BottomTabInset` is the constant the standard build's
          `useScreenPadding` uses, not a second guess at the same gap. */}
      <View style={{ height: insets.bottom + BottomTabInset }} />
    </ScrollView>
  );
}

/**
 * Name, account and goal race.
 *
 * The standard build gives the race its own illustrated `ProfileCard`. This one
 * folds it into the identity block as a badge and two lines — the artwork is
 * the single most expensive thing on the screen, and leaving it out is the
 * clearest way to see what the layout is doing without it.
 */
function Hero({ model }: { model: AltProfileModel }) {
  return (
    <Card>
      <HStack space="md" className="items-center">
        <Box className="h-14 w-14 items-center justify-center rounded-full bg-primary">
          <Text className="text-primary-foreground text-xl font-semibold">
            {initials(model.name)}
          </Text>
        </Box>
        <VStack className="flex-1">
          <Heading size="lg">{model.name}</Heading>
          {model.email ? (
            <Text size="sm" className="text-muted-foreground">
              {model.email}
            </Text>
          ) : null}
        </VStack>
      </HStack>

      {model.race ? (
        <>
          <Divider />
          <VStack space="xs">
            <Badge variant="secondary" className="self-start">
              <BadgeText>Goal race</BadgeText>
            </Badge>
            <Text className="text-foreground font-medium">{model.race.name}</Text>
            <Text size="sm" className="text-muted-foreground">
              {model.race.place} · {model.race.date}
            </Text>
            <Text size="sm" className="text-muted-foreground">
              Target: {model.race.target}
            </Text>
          </VStack>
        </>
      ) : null}
    </Card>
  );
}

/** A labelled card of rows. Renders nothing when it has no rows to show. */
function Section({
  title,
  rows,
  onNavigate,
}: {
  title: string;
  rows: AltRow[];
  onNavigate: (href: Href) => void;
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <VStack space="sm">
      <SectionLabel>{title}</SectionLabel>
      <Card size="sm" className="gap-0 py-0">
        {rows.map((row, index) => (
          <View key={row.label}>
            {/* Between rows rather than after each, so the card does not end on
                a rule sitting against its own border. */}
            {index > 0 ? <Divider /> : null}
            <Row row={row} onNavigate={onNavigate} />
          </View>
        ))}
      </Card>
    </VStack>
  );
}

function Row({ row, onNavigate }: { row: AltRow; onNavigate: (href: Href) => void }) {
  const href = row.href;

  const content = (
    <HStack space="md" className="items-center py-3">
      <VStack className="flex-1">
        <Text className="text-foreground">{row.label}</Text>
        {row.caption ? (
          <Text size="xs" className="text-muted-foreground">
            {row.caption}
          </Text>
        ) : null}
      </VStack>
      <Text
        size="sm"
        className={row.emphasis ? 'text-primary' : 'text-muted-foreground'}>
        {row.value}
      </Text>
      {href ? <Icon as={ChevronRightIcon} size="sm" className="text-muted-foreground" /> : null}
    </HStack>
  );

  if (!href) {
    return content;
  }

  return (
    <Pressable
      onPress={() => onNavigate(href)}
      accessibilityRole="button"
      accessibilityLabel={`${row.label}. ${row.value}`}>
      {content}
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text size="xs" className="text-muted-foreground uppercase tracking-wider">
      {children}
    </Text>
  );
}

function ErrorText({ children }: { children: string }) {
  return (
    <Text size="sm" className="text-destructive" accessibilityRole="alert">
      {children}
    </Text>
  );
}

/**
 * Collapsed by default, exactly as in the standard build: everything inside is
 * irreversible, so it takes a deliberate act to even see it.
 */
function Danger({ danger }: { danger: AltProfileModel['danger'] }) {
  const busy = danger.resetPending || danger.deletePending;

  return (
    <VStack space="sm">
      <Pressable
        onPress={danger.onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: danger.open }}
        accessibilityLabel="Danger zone">
        <HStack className="items-center justify-between">
          <Text size="xs" className="text-destructive uppercase tracking-wider">
            Danger zone
          </Text>
          <Icon as={ChevronDownIcon} size="sm" className="text-destructive" />
        </HStack>
      </Pressable>

      {danger.open ? (
        <VStack space="sm">
          <Button variant="outline" isDisabled={busy} onPress={busy ? undefined : danger.onReset}>
            <ButtonText>
              {danger.resetPending ? 'Resetting…' : 'Reset Training Plans'}
            </ButtonText>
          </Button>
          <Text size="xs" className="text-muted-foreground">
            Resets your training plans so a new one can be generated. Cannot be undone.
          </Text>

          <Button
            variant="destructive"
            isDisabled={busy}
            onPress={busy ? undefined : danger.onDelete}>
            <ButtonText>{danger.deletePending ? 'Deleting…' : 'Delete Account'}</ButtonText>
          </Button>
          <Text size="xs" className="text-muted-foreground">
            Permanently delete your account and all your data. Cannot be undone.
          </Text>
        </VStack>
      ) : null}

      {danger.error ? <ErrorText>{danger.error}</ErrorText> : null}
    </VStack>
  );
}

/** "Andrew Coyle" -> "AC". Stands in for the avatar the profile has no image for. */
function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
}
