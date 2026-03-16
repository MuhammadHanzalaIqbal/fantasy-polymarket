export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8001";

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (json?.detail) {
      return typeof json.detail === "string"
        ? json.detail
        : JSON.stringify(json.detail);
    }
  } catch {
    // ignore
  }
  return text || `${res.status} ${res.statusText}`;
}

async function getJSON<T>(path: string, headers?: HeadersInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json() as Promise<T>;
}

async function postJSON<T>(
  path: string,
  body: unknown,
  headers?: HeadersInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json() as Promise<T>;
}

export type HealthResponse = {
  app_name: string;
  version: string;
  chain_connected: boolean;
  latest_block: number | null;
  chain_id: number | null;
};

export type PlayerPoolResponse = {
  player_id: number;
  exists: boolean;
  total_shares: number;
  ftk_liquidity: number;
  share_price_wei: number | null;
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
  player_shares: Record<string, number>;
};

export type TransactionIntent = {
  to: string;
  data: string;
  value_wei: number;
  chain_id: number;
};

export type TradeIntentRequest = {
  wallet_address: string;
  side: QuoteSide;
  amount: number;
  slippage_bps: number;
};

export type TradeIntentResponse = {
  player_id: number;
  side: QuoteSide;
  amount_in: number;
  estimated_amount_out: number;
  min_amount_out: number;
  reference_price_wei: number;
  tx_intent: TransactionIntent;
  approval_token?: string | null;
  approval_spender?: string | null;
  required_allowance_wei?: number | null;
  current_allowance_wei?: number | null;
  approval_sufficient?: boolean | null;
};

export type ContestEntryIntentRequest = {
  wallet_address: string;
  players: number[];
};

export type ContestEntryIntentResponse = {
  contest_id: number;
  wallet_address: string;
  entry_fee: number;
  players: number[];
  resolved_players: number[];
  tx_intent: TransactionIntent;
  approval_token?: string | null;
  approval_spender?: string | null;
  required_allowance_wei?: number | null;
  current_allowance_wei?: number | null;
  approval_sufficient?: boolean | null;
};

export type ContestResultEntryResponse = {
  rank: number;
  user: string;
  score: number;
  prize_wei: number;
};

export type ContestResultsResponse = {
  contest_id: number;
  resolved: boolean;
  total_pot: number;
  winners_count: number;
  entries: ContestResultEntryResponse[];
};

export type TransactionResponse = {
  tx_hash: string;
  block_number: number | null;
  status: number;
};

export type AdminCreatePlayerRequest = {
  player_id: number;
  token_name: string;
  token_symbol: string;
};

export type AdminCreatePlayerResponse = {
  player_id: number;
  token_already_exists: boolean;
  player_already_listed: boolean;
  create_token_tx: TransactionResponse | null;
  add_market_tx: TransactionResponse | null;
};

export type AdminCreateContestRequest = {
  entry_fee: number;
  max_entries: number;
  start_time: number;
  lock_time: number;
  prize_bps: number[];
};

function adminHeaders(apiKey: string): HeadersInit {
  return {
    "X-API-Key": apiKey,
  };
}

export const api = {
  health: () => getJSON<HealthResponse>("/health"),

  players: (start_id = 1, end_id = 20) =>
    getJSON<PlayerPoolResponse[]>(`/players?start_id=${start_id}&end_id=${end_id}`),

  // IMPORTANT: backend expects query param name "amount"
  marketQuote: (player_id: number, side: QuoteSide, amount: number) =>
    getJSON<QuoteResponse>(`/market/${player_id}/quote?side=${side}&amount=${amount}`),

  playerQuote: (player_id: number, side: QuoteSide, amount: number) =>
    getJSON<QuoteResponse>(`/players/${player_id}/quote?side=${side}&amount=${amount}`),

  tradeIntent: (player_id: number, body: TradeIntentRequest) =>
    postJSON<TradeIntentResponse>(`/market/${player_id}/trade-intent`, body),

  contests: () => getJSON<ContestResponse[]>("/contests"),

  leaderboard: (contest_id: number) =>
    getJSON<LeaderboardEntryResponse[]>(`/contests/${contest_id}/leaderboard`),

  contestResults: (contest_id: number) =>
    getJSON<ContestResultsResponse>(`/contests/${contest_id}/results`),

  contestEntryIntent: (contest_id: number, body: ContestEntryIntentRequest) =>
    postJSON<ContestEntryIntentResponse>(`/contests/${contest_id}/entry-intent`, body),

  portfolio: (wallet: string) =>
    getJSON<PortfolioResponse>(`/portfolio/${wallet}`),

  mePortfolio: (wallet: string) =>
    getJSON<PortfolioResponse>(`/me/portfolio?wallet=${encodeURIComponent(wallet)}`),

  adminCreatePlayer: (body: AdminCreatePlayerRequest, apiKey: string) =>
    postJSON<AdminCreatePlayerResponse>(
      "/admin/players",
      body,
      adminHeaders(apiKey)
    ),

  adminCreateContest: (body: AdminCreateContestRequest, apiKey: string) =>
    postJSON<TransactionResponse>(
      "/admin/contests",
      body,
      adminHeaders(apiKey)
    ),

  adminResolveContest: (contest_id: number, apiKey: string) =>
    postJSON<TransactionResponse>(
      `/admin/contests/${contest_id}/resolve`,
      {},
      adminHeaders(apiKey)
    ),
};