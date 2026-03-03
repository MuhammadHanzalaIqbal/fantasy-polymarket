import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../services/api";
import type { LeaderboardEntryResponse } from "../services/api";

export default function ContestLeaderboard() {
  const { contestId } = useParams();
  const cid = useMemo(() => Number(contestId), [contestId]);

  const [rows, setRows] = useState<LeaderboardEntryResponse[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.leaderboard(cid).then(setRows).catch((e) => setErr(e.message ?? String(e)));
  }, [cid]);

  return (
    <div>
      <h1 style={{ margin: 0 }}>Contest #{cid} Leaderboard</h1>
      <p style={{ color: "#555" }}>GET /contests/{cid}/leaderboard</p>

      {err && <div style={errBox}>{err}</div>}

      <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 140px", padding: "10px 12px", background: "#fafafa", fontWeight: 800 }}>
          <div>Rank</div>
          <div>User</div>
          <div>Score</div>
        </div>
        {rows.map((r) => (
          <div key={`${r.user}-${r.rank}`} style={{ display: "grid", gridTemplateColumns: "80px 1fr 140px", padding: "10px 12px", borderTop: "1px solid #eee" }}>
            <div>{r.rank}</div>
            <div style={{ fontFamily: "monospace" }}>{r.user}</div>
            <div style={{ fontWeight: 800 }}>{r.score}</div>
          </div>
        ))}
        {rows.length === 0 && !err && <div style={{ padding: 12, color: "#666" }}>No entries</div>}
      </div>
    </div>
  );
}

const errBox: React.CSSProperties = { padding: 12, borderRadius: 10, border: "1px solid #f3c", marginBottom: 12 };