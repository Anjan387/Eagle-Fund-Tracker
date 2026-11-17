"use client";

import { useEffect, useState } from "react";
import { IconCalendar } from "@/components/icons";

/** Today's date in the viewer's time zone, for the page top bar. */
export function Today() {
  // set after mount: the server's clock and time zone may not be the viewer's
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    setLabel(
      new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    );
  }, []);
  if (!label) return null;
  return (
    <span className="hidden items-center gap-1.5 whitespace-nowrap text-xs text-muted sm:inline-flex">
      <IconCalendar size={14} />
      {label}
    </span>
  );
}
