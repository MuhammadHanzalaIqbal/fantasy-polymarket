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