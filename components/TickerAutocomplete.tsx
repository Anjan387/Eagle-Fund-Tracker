"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { inputClass } from "@/components/ui";

interface SymbolResult {
  symbol: string;
  name: string;
  exchange?: string;
}

/**
 * A ticker/company-name autocomplete meant to sit *inside* a form (Record a
 * trade, New proposal) — unlike components/StockSearch.tsx, selecting a
 * result fills this field rather than navigating anywhere. Submits as a
 * normal text input (`name` prop), so nothing changes for the server action
 * on the other end other than the value now reliably being a real symbol.
 *
 * Controlled (`value`/`onValueChange`) when a parent needs to set it
 * imperatively — e.g. AddTradeForm's "fill from an approved proposal" —
 * uncontrolled (`defaultValue`) otherwise.
 */
export function TickerAutocomplete({
  name,
  value: controlledValue,
  onValueChange,
  defaultValue = "",
  placeholder,
  required,
  autoFocus,
}: {
  name: string;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  const [innerValue, setInnerValue] = useState(defaultValue);
  const query = controlledValue ?? innerValue;
  const setQuery = (v: string) => {
    onValueChange?.(v);
    if (controlledValue === undefined) setInnerValue(v);
  };

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
        if (id !== requestId.current) return;
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

  function pick(symbol: string) {
    setQuery(symbol);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pick(results[activeIndex].symbol);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        name={name}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(-1);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        required={required}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={inputClass}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${name}-listbox`}
        autoComplete="off"
      />
      {open && (results.length > 0 || loading) ? (
        <ul
          id={`${name}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line-strong bg-surface shadow-lg"
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
                  pick(r.symbol);
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
  );
}
