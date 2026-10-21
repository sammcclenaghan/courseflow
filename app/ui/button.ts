// Button styles shared across the app: class={button.secondary}. Each style
// sets its own padding: two padding classes on one element would fight.
const base =
  "inline-flex h-control cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-control font-medium text-sm";

export const button = {
  primary: `${base} px-3 bg-ink bg-(image:--gradient-primary) text-surface-subtle shadow-primary disabled:cursor-not-allowed disabled:opacity-40`,
  secondary: `${base} px-3 bg-surface text-ink shadow-secondary`,
  icon: `${base} w-control hover:bg-fill`,
};
