import { useState } from "react";
import { api } from "../services/api";

export default function Admin() {
  const [apiKey, setApiKey] = useState("");

  const [playerId, setPlayerId] = useState(1);
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");

  const [entryFee, setEntryFee] = useState(0);
  const [maxEntries, setMaxEntries] = useState(10);
  const [startTime, setStartTime] = useState(0);
  const [lockTime, setLockTime] = useState(0);
  const [prizeBps, setPrizeBps] = useState("7000,2000,1000");

  const [resolveContestId, setResolveContestId] = useState(1);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function createPlayer() {
    try {
      setErr(null);
      setMsg(null);
      const res = await api.adminCreatePlayer(
        {
          player_id: playerId,
          token_name: tokenName,
          token_symbol: tokenSymbol,
        },
        apiKey
      );
      setMsg(`Player created/listed: ${JSON.stringify(res)}`);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  async function createContest() {
    try {
      setErr(null);
      setMsg(null);
      const res = await api.adminCreateContest(
        {
          entry_fee: entryFee,
          max_entries: maxEntries,
          start_time: startTime,
          lock_time: lockTime,
          prize_bps: prizeBps.split(",").map((x) => Number(x.trim())),
        },
        apiKey
      );
      setMsg(`Contest created: ${res.tx_hash}`);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  async function resolveContest() {
    try {
      setErr(null);
      setMsg(null);
      const res = await api.adminResolveContest(resolveContestId, apiKey);
      setMsg(`Contest resolved: ${res.tx_hash}`);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <h1 style={{ margin: 0 }}>Admin</h1>

      <div style={card}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Admin API key</div>
        <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={input} placeholder="X-API-Key" />
      </div>

      <div style={card}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Create player</div>
        <input type="number" value={playerId} onChange={(e) => setPlayerId(Number(e.target.value))} style={input} placeholder="player_id" />
        <input value={tokenName} onChange={(e) => setTokenName(e.target.value)} style={input} placeholder="token_name" />
        <input value={tokenSymbol} onChange={(e) => setTokenSymbol(e.target.value)} style={input} placeholder="token_symbol" />
        <button onClick={createPlayer} style={btn}>Create player</button>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Create contest</div>
        <input type="number" value={entryFee} onChange={(e) => setEntryFee(Number(e.target.value))} style={input} placeholder="entry_fee" />
        <input type="number" value={maxEntries} onChange={(e) => setMaxEntries(Number(e.target.value))} style={input} placeholder="max_entries" />
        <input type="number" value={startTime} onChange={(e) => setStartTime(Number(e.target.value))} style={input} placeholder="start_time unix" />
        <input type="number" value={lockTime} onChange={(e) => setLockTime(Number(e.target.value))} style={input} placeholder="lock_time unix" />
        <input value={prizeBps} onChange={(e) => setPrizeBps(e.target.value)} style={input} placeholder="7000,2000,1000" />
        <button onClick={createContest} style={btn}>Create contest</button>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Resolve contest</div>
        <input type="number" value={resolveContestId} onChange={(e) => setResolveContestId(Number(e.target.value))} style={input} placeholder="contest id" />
        <button onClick={resolveContest} style={btn}>Resolve contest</button>
      </div>

      {msg && <div style={infoBox}>{msg}</div>}
      {err && <div style={errBox}>{err}</div>}
    </div>
  );
}

const card: React.CSSProperties = { border: "1px solid #eee", borderRadius: 12, padding: 14, display: "grid", gap: 10 };
const input: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" };
const btn: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#111", color: "#fff", cursor: "pointer" };
const infoBox: React.CSSProperties = { padding: 12, borderRadius: 10, border: "1px solid #dde" };
const errBox: React.CSSProperties = { padding: 12, borderRadius: 10, border: "1px solid #f3c" };