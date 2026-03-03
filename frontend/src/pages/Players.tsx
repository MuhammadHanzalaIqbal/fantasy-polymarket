import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import type { PlayerPoolResponse } from "../services/api";

export default function Players() {
  const [startId, setStartId] = useState(1);
  const [endId, setEndId] = useState(20);
  const [players, setPlayers] = useState<PlayerPoolResponse[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const data = await api.players(startId, endId);
      setPlayers(data);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 style={{ margin: 0 }}>Players</h1>
      <p style={{ color: "#555" }}>Listed pools from PlayerMarket</p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <input type="number" value={startId} onChange={(e) => setStartId(Number(e.target.value))}
          style={input} min={1} />
        <input type="number" value={endId} onChange={(e) => setEndId(Number(e.target.value))}
          style={input} min={1} />
        <button onClick={load} style={btn}>{loading ? "Loading..." : "Reload"}</button>
      </div>

      {err && <div style={errBox}>{err}</div>}

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {players.map((p) => (
          <div key={p.player_id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 900 }}>Player #{p.player_id}</div>
              <div style={{ fontSize: 12, color: p.exists ? "green" : "crimson" }}>
                {p.exists ? "listed" : "not listed"}
              </div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 14 }}>
              <Row k="total_shares" v={String(p.total_shares)} />
              <Row k="ftk_liquidity" v={String(p.ftk_liquidity)} />
              <Row k="share_price_wei" v={String(p.share_price_wei)} />
            </div>

            <div style={{ marginTop: 12 }}>
              <Link to={`/players/${p.player_id}`} style={{ textDecoration: "none" }}>
                <button style={btnFull}>Open market →</button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ color: "#666" }}>{k}</span>
      <span style={{ fontWeight: 700 }}>{v}</span>
    </div>
  );
}

const input: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", width: 140 };
const btn: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#111", color: "#fff", cursor: "pointer" };
const btnFull: React.CSSProperties = { ...btn, width: "100%" };
const card: React.CSSProperties = { border: "1px solid #eee", borderRadius: 12, padding: 14 };
const errBox: React.CSSProperties = { padding: 12, borderRadius: 10, border: "1px solid #f3c", marginBottom: 12 };