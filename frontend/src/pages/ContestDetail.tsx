import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";
import type { LeaderboardEntryResponse } from "../services/api";
import { useWallet } from "../context/WalletContext";
import { sendIntentTransaction, waitForReceipt } from "../services/tx";

export default function ContestDetail() {
  const { contestId } = useParams();
  const cid = useMemo(() => Number(contestId), [contestId]);
  const { address, connect } = useWallet();

  const [rows, setRows] = useState<LeaderboardEntryResponse[]>([]);
  const [playersText, setPlayersText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    try {
      setErr(null);
      const data = await api.leaderboard(cid);
      setRows(data);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    load();
  }, [cid]);

  async function enterContest() {
    try {
      setErr(null);

      let wallet = address;
      if (!wallet) {
        await connect();
        wallet = (window as any).ethereum?.selectedAddress || null;
      }
      if (!wallet) throw new Error("Connect wallet first.");

      const players = playersText
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);

      if (players.length === 0) {
        throw new Error("Enter at least one valid player ID.");
      }

      setStatus("Building entry intent...");
      const intent = await api.contestEntryIntent(cid, {
        wallet_address: wallet,
        players,
      });

      setStatus("Waiting for wallet confirmation...");
      const hash = await sendIntentTransaction(wallet, intent.tx_intent);

      setStatus(`Submitted: ${hash}`);
      await waitForReceipt(hash);

      setStatus("Contest entry confirmed ✅");
      await load();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setStatus(null);
    }
  }

  return (
    <div>
      <h1 style={{ margin: 0 }}>Contest #{cid}</h1>
      <p style={{ color: "#555" }}>Leaderboard + entry flow</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Link to={`/contests/${cid}/results`}>
          <button style={btn}>View results</button>
        </Link>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Enter contest</div>
        <input
          value={playersText}
          onChange={(e) => setPlayersText(e.target.value)}
          placeholder="Enter player ids, e.g. 1,2,3,4,5"
          style={input}
        />
        <button onClick={enterContest} style={{ ...btn, marginTop: 10 }}>
          {address ? "Enter contest" : "Connect wallet + enter"}
        </button>
      </div>

      {status && <div style={infoBox}>{status}</div>}
      {err && <div style={errBox}>{err}</div>}

      <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 140px", padding: "10px 12px", background: "#fafafa", fontWeight: 800 }}>
          <div>Rank</div>
          <div>User</div>
          <div>Score</div>
        </div>
        {rows.map((r) => (
          <div key={`${r.user}-${r.rank}`} style={{ display: "grid", gridTemplateColumns: "80px 1fr 140px", padding: "10px 12px", borderTop: "1px solid #eee" }}>
            <div>{r.rank}</div>
            <div style={{ fontFamily: "monospace" }}>{r.user}</div>
            <div>{r.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const card: React.CSSProperties = { border: "1px solid #eee", borderRadius: 12, padding: 14, maxWidth: 700 };
const input: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" };
const btn: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#111", color: "#fff", cursor: "pointer" };
const errBox: React.CSSProperties = { padding: 12, borderRadius: 10, border: "1px solid #f3c", marginTop: 12 };
const infoBox: React.CSSProperties = { padding: 12, borderRadius: 10, border: "1px solid #dde", marginTop: 12 };