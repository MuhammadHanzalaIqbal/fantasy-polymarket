import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../services/api";
import type { QuoteResponse, QuoteSide } from "../services/api";

export default function PlayerMarket() {
  const { playerId } = useParams();
  const pid = useMemo(() => Number(playerId), [playerId]);

  const [side, setSide] = useState<QuoteSide>("buy");
  const [amount, setAmount] = useState<number>(1);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function getQuote() {
    setErr(null);
    setQuote(null);
    setLoading(true);
    try {
      // Uses /market/{player_id}/quote?side=...&amount=...
      const q = await api.marketQuote(pid, side, amount);
      setQuote(q);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ margin: 0 }}>Player #{pid} Market</h1>
      <p style={{ color: "#555" }}>Quote endpoint: /market/{pid}/quote</p>

      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14, maxWidth: 560 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={label}>
            side
            <select value={side} onChange={(e) => setSide(e.target.value as QuoteSide)} style={input}>
              <option value="buy">buy</option>
              <option value="sell">sell</option>
            </select>
          </label>

          <label style={label}>
            amount (query param name is "amount")
            <input type="number" value={amount} min={1} onChange={(e) => setAmount(Number(e.target.value))} style={input} />
          </label>

          <button onClick={getQuote} style={btn} disabled={loading || !pid || amount < 1}>
            {loading ? "Loading..." : "Get quote"}
          </button>

          {err && <div style={errBox}>{err}</div>}

          {quote && (
            <div style={{ borderTop: "1px solid #eee", paddingTop: 12, marginTop: 6, display: "grid", gap: 6 }}>
              <Row k="estimated_amount_out" v={String(quote.estimated_amount_out)} />
              <Row k="reference_price_wei" v={String(quote.reference_price_wei)} />
              <Row k="amount_in" v={String(quote.amount_in)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ color: "#666" }}>{k}</span>
      <span style={{ fontWeight: 800 }}>{v}</span>
    </div>
  );
}

const label: React.CSSProperties = { display: "grid", gap: 6, fontSize: 13 };
const input: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" };
const btn: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#111", color: "#fff", cursor: "pointer" };
const errBox: React.CSSProperties = { padding: 12, borderRadius: 10, border: "1px solid #f3c" };