"use client";

import { useEffect } from "react";

/** Opens the browser's print dialog (where "Save as PDF" lives) once the page has rendered. */
export function PrintOnLoad() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, []);
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-neutral-400 px-3 py-1.5 text-sm print:hidden"
    >
      Print or save as PDF
    </button>
  );
}
