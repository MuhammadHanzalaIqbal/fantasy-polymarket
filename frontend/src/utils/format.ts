const WEI_PER_UNIT = 10 ** 18;

/**
 * Converts human FTK amount to wei (18 decimals).
 * "1" -> 1e18, "1.5" -> 1.5e18.
 * Note: JS Number loses precision above 2^53; amounts over ~9e15 wei may be imprecise.
 */
export function humanToWei(human: number | string): number {
  const n = Number(human);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * WEI_PER_UNIT);
}

/**
 * Converts wei to human FTK amount for display.
 */
export function weiToHuman(wei: number | string | bigint | null | undefined): string {
  if (wei === null || wei === undefined) return "0";
  const big = typeof wei === "bigint" ? wei : BigInt(Math.floor(Number(wei)));
  if (big < 0n) return "0";
  const whole = big / BigInt(WEI_PER_UNIT);
  const frac = big % BigInt(WEI_PER_UNIT);
  if (frac === 0n) return String(whole);
  const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

/**
 * Converts human player ID to chain format (5 -> 5e18).
 * For admin create player only.
 */
export function humanToPlayerId(human: number | string): number {
  const n = Number(human);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * WEI_PER_UNIT);
}

/**
 * Formats wei amount as human FTK for display.
 */
export function formatFtk(wei: number | string | bigint | null | undefined): string {
  if (wei === null || wei === undefined) return "N/A";
  const s = weiToHuman(wei);
  return s === "0" ? "0" : s;
}

/**
 * Formats player ID for display. Converts 5e18 -> "5", leaves "5" as "5".
 */
export function formatPlayerId(id: number | string | null | undefined): string {
  if (id === null || id === undefined) return "N/A";
  const s = String(id);
  return s.endsWith("000000000000000000") ? s.slice(0, -18) : s;
}

/**
 * Formats share count (wei) for display. Same as formatFtk - shares use 18 decimals.
 */
export function formatShares(wei: number | string | bigint | null | undefined): string {
  return formatFtk(wei);
}

export function formatCompactNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "N/A";

  const raw = String(value);
  const num = Number(raw);

  if (!Number.isFinite(num)) return raw;

  if (Math.abs(num) >= 1_000_000_000_000) {
    return `${(num / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (Math.abs(num) >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(num) >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }

  return raw;
}

export function formatWallet(address: string | null | undefined) {
  if (!address) return "N/A";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatTimestamp(ts: number | string | null | undefined) {
  if (ts === null || ts === undefined) return "N/A";
  const num = Number(ts);
  if (!Number.isFinite(num) || num <= 0) return String(ts);

  try {
    return new Date(num * 1000).toLocaleString();
  } catch {
    return String(ts);
  }
}

const MOSCOW_TZ = "Europe/Moscow";

/**
 * Formats a Unix timestamp (seconds) as a human-readable date/time in Moscow.
 */
export function formatUnixToMoscow(
  unixSeconds: number | string | null | undefined
): string {
  if (unixSeconds === null || unixSeconds === undefined) return "—";
  const num = Number(unixSeconds);
  if (!Number.isFinite(num) || num <= 0) return "—";

  try {
    return new Date(num * 1000).toLocaleString("en-GB", {
      timeZone: MOSCOW_TZ,
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(unixSeconds);
  }
}

/**
 * Returns the current Unix timestamp in seconds.
 */
export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Formats Unix timestamp as Moscow date/time for input display.
 * Output format: DD.MM.YYYY HH:mm (parseable by parseMoscowToUnix).
 */
export function formatMoscowFromUnix(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return "";
  const d = new Date(unixSeconds * 1000);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MOSCOW_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}.${get("month")}.${get("year")} ${get("hour")}:${get("minute")}`;
}

/** Supported formats: DD.MM.YYYY HH:mm or YYYY-MM-DD HH:mm (Moscow time). */
const MOSCOW_UTC_OFFSET_HOURS = 3;

/**
 * Parses a Moscow date/time string to Unix seconds.
 * Accepts: "DD.MM.YYYY HH:mm" or "YYYY-MM-DD HH:mm".
 * Returns null if invalid.
 */
export function parseMoscowToUnix(str: string | null | undefined): number | null {
  if (!str || !str.trim()) return null;
  const s = str.trim();

  const ddmmyyyy = s.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );
  if (ddmmyyyy) {
    const [, day, month, year, hour, minute, sec] = ddmmyyyy.map(Number);
    const utcMs = Date.UTC(
      year,
      month - 1,
      day,
      hour - MOSCOW_UTC_OFFSET_HOURS,
      minute,
      sec || 0
    );
    return Math.floor(utcMs / 1000);
  }

  const yyyymmdd = s.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );
  if (yyyymmdd) {
    const [, year, month, day, hour, minute, sec] = yyyymmdd.map(Number);
    const utcMs = Date.UTC(
      year,
      month - 1,
      day,
      hour - MOSCOW_UTC_OFFSET_HOURS,
      minute,
      sec || 0
    );
    return Math.floor(utcMs / 1000);
  }

  return null;
}