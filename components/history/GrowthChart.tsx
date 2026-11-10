"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// The chart library is only downloaded once this section is near the screen.
const AumChart = dynamic(() => import("@/components/charts/AumChart").then((m) => m.AumChart), {
  ssr: false,
  loading: () => <ChartSpace />,
});

function ChartSpace() {
  return <div className="h-64 w-full animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none" />;
}

export function GrowthChart({ data }: { data: { year: number; value: number; live: boolean }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{near ? <AumChart data={data} /> : <ChartSpace />}</div>;
}
