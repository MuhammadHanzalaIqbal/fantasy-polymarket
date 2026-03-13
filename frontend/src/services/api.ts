export const API_BASE =
  import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8001";

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export type HealthResponse = {
  app_name: string;
  version: string;
  chain_connected: boolean;
  latest_block: number;
  chain_id: number;
};

export type PlayerPoolResponse = {
  player_id: number;
  exists: boolean;
  total_shares: number;
  ftk_liquidity: number;
  share_price_wei: number;
};

export type QuoteSide = "buy" | "sell";

export type QuoteResponse = {
  player_id: number;
  side: QuoteSide;
  amount_in: number;
  estimated_amount_out: number;
  reference_price_wei: number;
};

export type ContestResponse = {
  contest_id: number;
  entry_fee: number;
  max_entries: number;
  start_time: number;
  lock_time: number;
  rake_bps: number;
  resolved: boolean;
  total_pot: number;
};

export type LeaderboardEntryResponse = {
  rank: number;
  user: string;
  score: number;
};

export type PortfolioResponse = {
  wallet_address: string;
  ftk_balance: number;
  player_shares: Record<string, number>; // backend dict[int,int] becomes keys as strings in JSON
};

export const api = {
  health: () => getJSON<HealthResponse>("/health"),

  players: (start_id = 1, end_id = 20) =>
    getJSON<PlayerPoolResponse[]>(`/players?start_id=${start_id}&end_id=${end_id}`),

  // IMPORTANT: backend expects query param name "amount"
  marketQuote: (player_id: number, side: QuoteSide, amount: number) =>
    getJSON<QuoteResponse>(`/market/${player_id}/quote?side=${side}&amount=${amount}`),

  playerQuote: (player_id: number, side: QuoteSide, amount: number) =>
    getJSON<QuoteResponse>(`/players/${player_id}/quote?side=${side}&amount=${amount}`),

  contests: () => getJSON<ContestResponse[]>("/contests"),

  leaderboard: (contest_id: number) =>
    getJSON<LeaderboardEntryResponse[]>(`/contests/${contest_id}/leaderboard`),

  portfolio: (wallet: string) => getJSON<PortfolioResponse>(`/portfolio/${wallet}`),
};