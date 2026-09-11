/**
 * The heading for one day of the plan.
 *
 * Derived from an offset rather than stored, so the list stays correct the next
 * morning without anything having to rewrite it.
 */
import { SectionHeading } from './section-heading';

type DayHeadingProps = {
  /** Days from today. 0 is today, 1 tomorrow, and so on. */
  dayOffset: number;
};

/** "Today", "Tomorrow", then "In 2 days" onwards. */
function label(dayOffset: number) {
  if (dayOffset === 0) {
    return 'Today';
  }
  if (dayOffset === 1) {
    return 'Tomorrow';
  }
  return `In ${dayOffset} days`;
}

/**
 * The two strings a day's heading is made of.
 *
 * Exported because the gluestack build of the dashboard needs the same pair
 * without this component's markup — `components/alt/dashboard-screen.tsx` draws
 * them inside its own day card. Deriving them twice would be two chances for
 * the two builds to disagree about what "Tomorrow" means at midnight.
 */
export function dayHeadingLabels(dayOffset: number) {
  const date = new Date();
  // setDate rolls over month and year ends on its own, so no bounds maths here.
  date.setDate(date.getDate() + dayOffset);

  return {
    title: label(dayOffset),
    caption: date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
  };
}

export function DayHeading({ dayOffset }: DayHeadingProps) {
  const { title, caption } = dayHeadingLabels(dayOffset);

  return <SectionHeading title={title} caption={caption} />;
}
