"use client";

import { useEffect, useRef } from "react";

// The fund's actual current holdings (see supabase/schema.sql) - real tickers,
// not placeholder data, scrolling like a market ticker.
const TICKERS = [
  "ACWI", "AGG", "VISGX", "AAPL", "GOOG", "SCHW", "AMZN", "UBER",
  "GLD", "GSG", "BOXX", "REMIX", "CAOS", "RSST", "RSBT", "VGSH", "SPYC",
];

/**
 * Decorative background for the login page. Three layers, all built from
 * the app's own blue/gold Juniata tokens so it holds in both themes:
 *  - a shaded eagle gliding over a ridge line, with pointer parallax
 *  - a hand-drawn "growth" line chart (a real investing-UI convention)
 *  - a scrolling ticker tape of the fund's actual holdings
 * No real photography is used - see the accompanying note about why.
 * Purely atmospheric: aria-hidden, pointer-events-none, motion stops under
 * prefers-reduced-motion.
 */
export function EagleBackground() {
  const eagleRef = useRef<SVGGElement>(null);
  const ridgeFarRef = useRef<SVGGElement>(null);
  const ridgeNearRef = useRef<SVGGElement>(null);
  const chartRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = e.clientX / window.innerWidth - 0.5; // -0.5..0.5
        const y = e.clientY / window.innerHeight - 0.5;
        if (eagleRef.current) eagleRef.current.style.transform = `translate(${x * 36}px, ${y * 20}px)`;
        if (chartRef.current) chartRef.current.style.transform = `translate(${x * -10}px, ${y * -6}px)`;
        if (ridgeNearRef.current) ridgeNearRef.current.style.transform = `translate(${x * 12}px, 0)`;
        if (ridgeFarRef.current) ridgeFarRef.current.style.transform = `translate(${x * 6}px, 0)`;
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  const tape = [...TICKERS, ...TICKERS]; // duplicated once for a seamless scroll loop

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" className="h-full w-full">
        <defs>
          <linearGradient id="eagle-bg-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.14" />
            <stop offset="55%" stopColor="var(--canvas)" />
            <stop offset="100%" stopColor="var(--gold-soft)" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id="eagle-bg-eagle" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.55" />
          </radialGradient>
          <filter id="eagle-bg-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="var(--brand)" floodOpacity="0.18" />
          </filter>
        </defs>
        <rect width="1200" height="800" fill="url(#eagle-bg-sky)" />

        {/* distant ridge */}
        <g ref={ridgeFarRef} style={{ transition: "transform 0.5s ease-out" }}>
          <path
            d="M0,560 C150,500 300,540 420,500 C560,455 680,520 820,480 C960,445 1080,500 1200,470 L1200,800 L0,800 Z"
            fill="var(--brand)"
            opacity="0.22"
          />
        </g>
        {/* nearer ridge */}
        <g ref={ridgeNearRef} style={{ transition: "transform 0.5s ease-out" }}>
          <path
            d="M0,640 C180,590 340,630 480,600 C620,570 760,620 920,590 C1040,568 1120,600 1200,585 L1200,800 L0,800 Z"
            fill="var(--brand)"
            opacity="0.34"
          />
        </g>

        {/* a real investing-UI convention: an upward-trending chart line, drawing itself in */}
        <g ref={chartRef} style={{ transition: "transform 0.5s ease-out" }}>
          <polyline
            className="chart-draw"
            points="40,560 160,590 260,520 360,545 460,470 560,500 660,410 760,440 860,340 960,375 1060,270 1160,300"
            fill="none"
            stroke="var(--gold)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
          />
          {[[40, 560], [360, 545], [660, 410], [1060, 270]].map(([cx, cy], i) => (
            <circle
              key={cx}
              cx={cx}
              cy={cy}
              r="6"
              fill="var(--gold)"
              opacity="0.7"
              className="chart-pulse"
              style={{ animationDelay: `${i * 0.4}s` }}
            />
          ))}
        </g>

        {/* gliding eagle: outer group is the ambient drift, middle is fixed size/position,
            inner is the pointer parallax - kept separate so the JS-set inline transform on
            the inner group never clobbers the static one on the middle group */}
        <g className="eagle-drift">
          <g transform="translate(0,60) scale(1.6)">
            <g ref={eagleRef} style={{ transition: "transform 0.5s ease-out" }} filter="url(#eagle-bg-soft)">
              <path
                d="M600,205
                   C560,190 470,178 360,215
                   C430,228 500,236 565,222
                   C572,245 578,268 600,300
                   C622,268 628,245 635,222
                   C700,236 770,228 840,215
                   C730,178 640,190 600,205 Z
                   M591,250 L600,296 L609,250 L600,266 Z"
                fill="url(#eagle-bg-eagle)"
              />
              {/* a few feather strokes for texture, rather than a flat silhouette */}
              <path d="M420,206 C450,214 480,220 510,220" stroke="var(--brand)" strokeWidth="2" fill="none" opacity="0.35" />
              <path d="M780,206 C750,214 720,220 690,220" stroke="var(--brand)" strokeWidth="2" fill="none" opacity="0.35" />
            </g>
          </g>
        </g>
      </svg>

      {/* scrolling ticker tape of the fund's actual holdings - one track holding the
          list twice back-to-back, animated exactly half its own width for a seamless loop */}
      <div className="ticker-tape absolute inset-x-0 bottom-6 whitespace-nowrap font-mono text-xs tracking-widest text-brand opacity-30">
        <div className="ticker-track inline-flex gap-10 pr-10">
          {tape.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
