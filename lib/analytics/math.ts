// Statistics for the Analytics page. Pure functions, no I/O, safe to import
// from client components. Returns are simple daily returns as fractions
// (0.01 = 1%). Annualizing assumes 252 trading days.

export const TRADING_DAYS = 252;

export function sum(x: number[]): number {
  let s = 0;
  for (const v of x) s += v;
  return s;
}

export function mean(x: number[]): number {
  return x.length ? sum(x) / x.length : 0;
}

/** Sample variance (n - 1). */
export function variance(x: number[]): number {
  if (x.length < 2) return 0;
  const m = mean(x);
  let s = 0;
  for (const v of x) s += (v - m) * (v - m);
  return s / (x.length - 1);
}

export function stdev(x: number[]): number {
  return Math.sqrt(variance(x));
}

/** Sample covariance (n - 1). */
export function covariance(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x);
  const my = mean(y);
  let s = 0;
  for (let i = 0; i < n; i++) s += (x[i] - mx) * (y[i] - my);
  return s / (n - 1);
}

export function correlation(x: number[], y: number[]): number {
  const d = stdev(x) * stdev(y);
  return d > 0 ? covariance(x, y) / d : 0;
}

/** Covariance matrix of several return series (each `cols[i]` is one series). */
export function covMatrix(cols: number[][]): number[][] {
  const k = cols.length;
  const out: number[][] = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = i; j < k; j++) {
      const c = covariance(cols[i], cols[j]);
      out[i][j] = c;
      out[j][i] = c;
    }
  }
  return out;
}

/** Daily simple returns from a price series. */
export function toReturns(prices: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < prices.length; i++) r.push(prices[i - 1] > 0 ? prices[i] / prices[i - 1] - 1 : 0);
  return r;
}

/** Compounded return of a series of period returns. */
export function compound(r: number[]): number {
  let v = 1;
  for (const x of r) v *= 1 + x;
  return v - 1;
}

/** Quantile by linear interpolation between order statistics (the usual "type 7"). */
export function quantile(x: number[], p: number): number {
  if (x.length === 0) return 0;
  const s = [...x].sort((a, b) => a - b);
  const h = (s.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return s[lo] + (s[hi] - s[lo]) * (h - lo);
}

export interface Ols {
  alpha: number;
  beta: number;
  /** standard error of beta */
  seBeta: number;
  r2: number;
  n: number;
}

/** Ordinary least squares of y on a single x, with an intercept. */
export function ols(y: number[], x: number[]): Ols {
  const n = Math.min(x.length, y.length);
  if (n < 3) return { alpha: 0, beta: 0, seBeta: 0, r2: 0, n };
  const mx = mean(x);
  const my = mean(y);
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (x[i] - mx) * (x[i] - mx);
    sxy += (x[i] - mx) * (y[i] - my);
    syy += (y[i] - my) * (y[i] - my);
  }
  if (sxx === 0) return { alpha: my, beta: 0, seBeta: 0, r2: 0, n };
  const beta = sxy / sxx;
  const alpha = my - beta * mx;
  const sse = Math.max(syy - beta * sxy, 0);
  return {
    alpha,
    beta,
    seBeta: Math.sqrt(sse / (n - 2) / sxx),
    r2: syy > 0 ? 1 - sse / syy : 0,
    n,
  };
}

/** Inverse of a small square matrix by Gauss-Jordan elimination; null if singular. */
export function invert(m: number[][]): number[][] | null {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    if (Math.abs(a[pivot][col]) < 1e-14) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const d = a[col][col];
    for (let j = 0; j < 2 * n; j++) a[col][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j];
    }
  }
  return a.map((row) => row.slice(n));
}

export interface MultiOls {
  alpha: number;
  betas: number[];
  /** standard errors of the betas */
  se: number[];
  tStats: number[];
  r2: number;
  n: number;
}

/** OLS of y on several regressors (`xs[k]` is the k-th regressor's series), with an intercept. */
export function olsMulti(y: number[], xs: number[][]): MultiOls | null {
  const n = y.length;
  const k = xs.length;
  if (n <= k + 2 || xs.some((x) => x.length !== n)) return null;
  // design matrix columns: intercept, then each regressor
  const cols = [new Array<number>(n).fill(1), ...xs];
  const p = k + 1;
  const xtx: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const xty = new Array<number>(p).fill(0);
  for (let i = 0; i < p; i++) {
    for (let j = i; j < p; j++) {
      let s = 0;
      for (let t = 0; t < n; t++) s += cols[i][t] * cols[j][t];
      xtx[i][j] = s;
      xtx[j][i] = s;
    }
    let s = 0;
    for (let t = 0; t < n; t++) s += cols[i][t] * y[t];
    xty[i] = s;
  }
  const inv = invert(xtx);
  if (!inv) return null;
  const b = inv.map((row) => row.reduce((s, v, j) => s + v * xty[j], 0));
  const my = mean(y);
  let sse = 0;
  let sst = 0;
  for (let t = 0; t < n; t++) {
    let fit = 0;
    for (let i = 0; i < p; i++) fit += b[i] * cols[i][t];
    sse += (y[t] - fit) * (y[t] - fit);
    sst += (y[t] - my) * (y[t] - my);
  }
  const s2 = sse / (n - p);
  const se = inv.map((row, i) => Math.sqrt(Math.max(s2 * row[i], 0)));
  return {
    alpha: b[0],
    betas: b.slice(1),
    se: se.slice(1),
    tStats: b.slice(1).map((v, i) => (se[i + 1] > 0 ? v / se[i + 1] : 0)),
    r2: sst > 0 ? 1 - sse / sst : 0,
    n,
  };
}

export interface Drawdown {
  /** drawdown at each point, as a fraction <= 0 */
  series: number[];
  /** the deepest drawdown (<= 0) */
  max: number;
  peakIndex: number;
  troughIndex: number;
  /** drawdown at the last point */
  current: number;
}

/** Peak-to-trough analysis of a value series (prices or an index). */
export function drawdown(values: number[]): Drawdown {
  const series: number[] = [];
  let peak = -Infinity;
  let peakAt = 0;
  let max = 0;
  let peakIndex = 0;
  let troughIndex = 0;
  values.forEach((v, i) => {
    if (v > peak) {
      peak = v;
      peakAt = i;
    }
    const dd = peak > 0 ? v / peak - 1 : 0;
    series.push(dd);
    if (dd < max) {
      max = dd;
      peakIndex = peakAt;
      troughIndex = i;
    }
  });
  return { series, max, peakIndex, troughIndex, current: series[series.length - 1] ?? 0 };
}

/** Rolling annualized volatility; entries before a full window are null. */
export function rollingVol(r: number[], window: number): (number | null)[] {
  return r.map((_, i) =>
    i + 1 < window ? null : stdev(r.slice(i + 1 - window, i + 1)) * Math.sqrt(TRADING_DAYS),
  );
}

export const annualVol = (r: number[]) => stdev(r) * Math.sqrt(TRADING_DAYS);

/**
 * Sharpe ratio of a series of daily EXCESS returns, annualized, with its
 * standard error (Lo, 2002, for independent returns): the estimate is only
 * known to about +/- 2 standard errors.
 */
export function sharpe(excess: number[]): { ratio: number; se: number } {
  const sd = stdev(excess);
  if (sd === 0 || excess.length < 2) return { ratio: 0, se: 0 };
  const daily = mean(excess) / sd;
  return {
    ratio: daily * Math.sqrt(TRADING_DAYS),
    se: Math.sqrt((1 + 0.5 * daily * daily) / excess.length) * Math.sqrt(TRADING_DAYS),
  };
}

/** Sortino ratio of daily excess returns, annualized: mean over downside deviation (target 0). */
export function sortino(excess: number[]): number {
  if (excess.length === 0) return 0;
  let s = 0;
  for (const v of excess) if (v < 0) s += v * v;
  const downside = Math.sqrt(s / excess.length);
  return downside > 0 ? (mean(excess) / downside) * Math.sqrt(TRADING_DAYS) : 0;
}

/** Historical value-at-risk and expected shortfall, as positive loss fractions. */
export function valueAtRisk(r: number[], level = 0.95): { var: number; es: number } {
  if (r.length === 0) return { var: 0, es: 0 };
  const cut = quantile(r, 1 - level);
  const tail = r.filter((v) => v <= cut);
  return { var: Math.max(-cut, 0), es: Math.max(-mean(tail.length ? tail : [cut]), 0) };
}

// ---- portfolio algebra -------------------------------------------------------

/** w' C w */
export function quadForm(w: number[], c: number[][], v: number[] = w): number {
  let s = 0;
  for (let i = 0; i < w.length; i++) {
    if (w[i] === 0) continue;
    for (let j = 0; j < v.length; j++) s += w[i] * c[i][j] * v[j];
  }
  return s;
}

/** (C w)_i for each i */
export function matVec(c: number[][], w: number[]): number[] {
  return c.map((row) => row.reduce((s, v, j) => s + v * w[j], 0));
}

/** Piecewise-linear interpolation through (0,0) and the given points; extends the last slope. */
export function interpolate(points: { x: number; y: number }[], x: number): number {
  const pts = [{ x: 0, y: 0 }, ...points.filter((p) => p.x > 0).sort((a, b) => a.x - b.x)];
  if (pts.length === 1) return 0;
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i].x) {
      const t = (x - pts[i - 1].x) / (pts[i].x - pts[i - 1].x);
      return pts[i - 1].y + t * (pts[i].y - pts[i - 1].y);
    }
  }
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  return b.y + ((x - b.x) * (b.y - a.y)) / (b.x - a.x);
}
