// 16px line icons on a 24-unit grid, drawn in the text colour.
import type { ComponentChildren } from "preact";

function Icon({
  children,
  size = 16,
}: {
  children: ComponentChildren;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const ChevronLeft = () => (
  <Icon>
    <path d="m15 18-6-6 6-6" />
  </Icon>
);

export const ChevronRight = () => (
  <Icon>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);

export const ChevronDown = () => (
  <Icon>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const Close = () => (
  <Icon>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

export const Info = () => (
  <Icon size={13}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </Icon>
);

export const Grid = () => (
  <Icon>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Icon>
);
