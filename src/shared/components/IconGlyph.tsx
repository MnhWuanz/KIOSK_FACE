import type { ReactNode } from "react";

export function IconGlyph({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span aria-hidden="true" className={`inline-grid place-items-center font-bold leading-none ${className}`}>{children}</span>;
}
