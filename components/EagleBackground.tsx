"use client";

import { useEffect, useRef } from "react";

/**
 * Decorative background for the login page: a gliding eagle over a soft
 * ridge line (a nod to Huntingdon's hill country), in the app's own
 * blue/gold tokens so it holds in both themes. The eagle drifts on its own
 * and parallaxes gently with the pointer; both stop under
 * prefers-reduced-motion. Purely atmospheric — aria-hidden and
 * pointer-events-none, so it never competes with or blocks the actual form.
 */
export function EagleBackground() {
  const eagleRef = useRef<SVGGElement>(null);
  const ridgeFarRef = useRef<SVGGElement>(null);
  const ridgeNearRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = e.clientX / window.innerWidth - 0.5; // -0.5..0.5
        const y = e.clientY / window.innerHeight - 0.5;
        if (eagleRef.current) eagleRef.current.style.transform = `translate(${x * 36}px, ${y * 20}px)`;
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

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" className="h-full w-full">
        <defs>
          <linearGradient id="eagle-bg-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--canvas)" />
            <stop offset="100%" stopColor="var(--surface-2)" />
          </linearGradient>
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

        {/* gliding eagle: outer group is the ambient drift, middle is fixed size/position,
            inner is the pointer parallax — kept separate so the JS-set inline transform on
            the inner group never clobbers the static one on the middle group */}
        <g className="eagle-drift">
          <g transform="translate(0,60) scale(1.6)">
            <g ref={eagleRef} style={{ transition: "transform 0.5s ease-out" }}>
              <path
                d="M600,205
                   C560,190 470,178 360,215
                   C430,228 500,236 565,222
                   C572,245 578,268 600,300
                   C622,268 628,245 635,222
                   C700,236 770,228 840,215
                   C730,178 640,190 600,205 Z
                   M591,250 L600,296 L609,250 L600,266 Z"
                fill="var(--gold)"
                opacity="0.9"
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
