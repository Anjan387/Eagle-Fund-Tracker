"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui";

interface SymbolResult {
  symbol: string;
  name: string;
  exchange?: string;
}

/**
 * Autocomplete search by company name or ticker (Apple / AAPL both find
 * Apple Inc.), backed by /api/symbol-search. Debounced, keyboard-navigable,
 * closes on outside click or Escape. Selecting a result — or pressing Enter
 * with nothing selected — navigates to /research/[ticker].
 */
export function StockSearch({
  autoFocus = false,
  placeholder,
}: {
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setOpen(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/symbol-search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { results?: SymbolResult[] };
        if (id !== requestId.current) return; // a newer keystroke has already superseded this
        setResults(data.results ?? []);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        if (id === requestId.current) setResults([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function go(rawSymbol: string) {
    const t = rawSymbol.trim().toUpperCase().replace(/[^A-Z.]/g, "");
    if (!t) return;
    setOpen(false);
    setQuery("");
    router.push(`/research/${t}`);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        go(query);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(activeIndex >= 0 ? results[activeIndex].symbol : query);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(activeIndex >= 0 ? (results[activeIndex]?.symbol ?? query) : query);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => results.length > 0 && setOpen(true)}
            autoFocus={autoFocus}
            placeholder={placeholder ?? "Search by company name or ticker — Apple, AAPL, VOO…"}
            className={inputClass}
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls="stock-search-listbox"
            autoComplete="off"
          />
          {open && (results.length > 0 || loading) ? (
            <ul
              id="stock-search-listbox"
              role="listbox"
              className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-line-strong bg-surface shadow-lg"
            >
              {loading && results.length === 0 ? (
                <li className="px-3 py-2 text-xs text-faint">Searching…</li>
              ) : (
                results.map((r, i) => (
                  <li
                    key={r.symbol}
                    role="option"
                    aria-selected={i === activeIndex}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      go(r.symbol);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${
                      i === activeIndex ? "bg-brand/10" : ""
                    }`}
                  >
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="font-semibold text-ink">{r.symbol}</span>
                      <span className="truncate text-xs text-muted">{r.name}</span>
                    </span>
                    {r.exchange ? (
                      <span className="shrink-0 text-[10px] uppercase text-faint">{r.exchange}</span>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-contrast hover:bg-brand-hover"
        >
          Look up
        </button>
      </form>
    </div>
  );
}
