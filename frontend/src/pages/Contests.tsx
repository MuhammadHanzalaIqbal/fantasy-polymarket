import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import type { ContestResponse } from "../services/api";


export default function Contests() {
  const [contests, setContests] = useState<ContestResponse[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.contests().then(setContests).catch((e) => setErr(e.message ?? String(e)));
  }, []);

  return (
    <div>
      <h1 style={{ margin: 0 }}>Contests</h1>
      <p style={{ color: "#555" }}>Read contests from ContestManager</p>

      {err && <div style={errBox}>{err}</div>}

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {contests.map((c) => (
          <div key={c.contest_id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 900 }}>Contest #{c.contest_id}</div>
              <div style={{ fontSize: 12, color: c.resolved ? "green" : "#aa7" }}>
                {c.resolved ? "resolved" : "open"}
              </div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 14 }}>
              <Row k="entry_fee" v={String(c.entry_fee)} />
              <Row k="max_entries" v={String(c.max_entries)} />
              <Row k="rake_bps" v={String(c.rake_bps)} />
              <Row k="total_pot" v={String(c.total_pot)} />
              <Row k="start_time" v={String(c.start_time)} />
              <Row k="lock_time" v={String(c.lock_time)} />
            </div>

            <div style={{ marginTop: 12 }}>
              <Link to={`/contests/${c.contest_id}`} style={{ textDecoration: "none" }}>
                <button style={btnFull}>View leaderboard →</button>
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

const card: React.CSSProperties = { border: "1px solid #eee", borderRadius: 12, padding: 14 };
const btnFull: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#111", color: "#fff", cursor: "pointer", width: "100%" };
const errBox: React.CSSProperties = { padding: 12, borderRadius: 10, border: "1px solid #f3c", marginBottom: 12 };