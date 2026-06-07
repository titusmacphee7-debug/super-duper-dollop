import type { ReactNode } from "react";

export type IconName =
  | "wishlist"
  | "projects"
  | "inventory"
  | "tools"
  | "expenses"
  | "bolt"
  | "link"
  | "check"
  | "plus"
  | "arrow"
  | "refresh"
  | "search"
  | "down"
  | "up";

const PATHS: Record<IconName, ReactNode> = {
  wishlist: <path d="M12 4l2.3 4.8 5.2.7-3.8 3.6.9 5.2L12 16.1 7.4 18.6l.9-5.2L4.5 9.5l5.2-.7z" />,
  projects: (
    <>
      <path d="M4 7h6l2 2h8v10H4z" />
      <path d="M4 7V5h5l2 2" />
    </>
  ),
  inventory: (
    <>
      <path d="M4 8l8-4 8 4-8 4-8-4z" />
      <path d="M4 8v8l8 4 8-4V8" />
      <path d="M12 12v8" />
    </>
  ),
  tools: (
    <path d="M14.5 5.5a3.5 3.5 0 0 0-4.7 4.3L4 15.6 6.4 18l5.8-5.8a3.5 3.5 0 0 0 4.3-4.7l-2.1 2.1-1.9-.5-.5-1.9z" />
  ),
  expenses: (
    <>
      <path d="M5 4h11l3 3v13l-2.2-1.3L14.6 20l-2.2-1.3L10.2 20 8 18.7 5.8 20 5 18.5z" />
      <path d="M9 9h6M9 13h6" />
    </>
  ),
  bolt: <path d="M13 3L5 13h5l-1 8 8-11h-5z" fill="currentColor" stroke="none" />,
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l2.5-2.5a4 4 0 0 0-5.7-5.7L11 7" />
      <path d="M14 10a4 4 0 0 0-5.7 0L5.8 12.5a4 4 0 0 0 5.7 5.7L13 17" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-.5 4" />
      <path d="M20 5v6h-6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4-4" />
    </>
  ),
  down: <path d="M12 5v13M6 13l6 6 6-6" />,
  up: <path d="M12 19V6M6 11l6-6 6 6" />,
};

export function Icon({ name, size = 19 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
