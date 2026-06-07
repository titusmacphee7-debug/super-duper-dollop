import type { ReactNode } from "react";
import { Sidebar, type NavKey } from "./cards";

/** The app chrome: the centered graphite frame + sticky sidebar. Pages supply the shell content. */
export function AppFrame({ active, children }: { active: NavKey; children: ReactNode }) {
  return (
    <div className="wb-root">
      <Sidebar active={active} />
      <div className="wb-shell">{children}</div>
    </div>
  );
}
