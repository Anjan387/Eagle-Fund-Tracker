"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inputClass } from "@/components/ui";

export function TickerSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const t = value.trim().toUpperCase().replace(/[^A-Z.]/g, "");
    if (t) router.push(`/research/${t}`);
  }

  return (
    <form onSubmit={go} className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus={autoFocus}
        placeholder="Search any ticker — AAPL, INTU, VOO…"
        className={inputClass}
        aria-label="Ticker symbol"
      />
      <button
        type="submit"
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-contrast hover:bg-brand-hover"
      >
        Look up
      </button>
    </form>
  );
}
