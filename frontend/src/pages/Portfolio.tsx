import { useState } from "react";
import { api } from "../services/api";
import type { PortfolioResponse } from "../services/api";

export default function Portfolio() {
  const [wallet, setWallet] = useState("");
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setErr(null);
    setData(null);
    setLoading(true);
    try {
      const p = await api.portfolio(wallet.trim());
      setData(p);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ margin: 0 }}>Portfolio</h1>
      <p style={{ color: "#555" }}>GET /portfolio/{`{wallet_address}`}</p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="0x..."
          style={input}
        />
        <button onClick={load} style={btn} disabled={loading || wallet.trim().length < 10}>
          {loading ? "Loading..." : "Load"}
        </button>
      </div>

      {err && <div style={errBox}>{err}</div>}

      {data && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={card}>
            <div style={{ fontSize: 12, color: "#666" }}>Wallet</div>
            <div style={{ fontFamily: "monospace", fontWeight: 800 }}>{data.wallet_address}</div>
            <div style={{ marginTop: 10 }}>
              <span style={{ color: "#666" }}>FTK balance: </span>
              <span style={{ fontWeight: 900 }}>{data.ftk_balance}</span>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Player shares</div>
            {Object.keys(data.player_shares).length === 0 ? (
              <div style={{ color: "#666" }}>No shares</div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {Object.entries(data.player_shares).map(([pid, amt]) => (
                  <div key={pid} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666" }}>Player {pid}</span>
                    <span style={{ fontWeight: 800 }}>{amt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const input: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", width: 420, maxWidth: "100%" };
const btn: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#111", color: "#fff", cursor: "pointer" };
const card: React.CSSProperties = { border: "1px solid #eee", borderRadius: 12, padding: 14 };
const errBox: React.CSSProperties = { padding: 12, borderRadius: 10, border: "1px solid #f3c", marginBottom: 12 };