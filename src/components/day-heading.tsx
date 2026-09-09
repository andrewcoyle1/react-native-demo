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

export function DayHeading({ dayOffset }: DayHeadingProps) {
  const date = new Date();
  // setDate rolls over month and year ends on its own, so no bounds maths here.
  date.setDate(date.getDate() + dayOffset);

  const caption = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return <SectionHeading title={label(dayOffset)} caption={caption} />;
}
