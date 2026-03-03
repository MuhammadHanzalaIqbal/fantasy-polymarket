import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { HealthResponse } from "../services/api";

export default function Home() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.health().then(setData).catch((e) => setErr(e.message ?? String(e)));
  }, []);

  return (
    <div>
      <h1 style={{ margin: 0 }}>Dashboard</h1>
      <p style={{ color: "#555" }}>Backend + chain connectivity</p>

      {err && <Box tone="danger">{err}</Box>}
      {!data ? (
        <div>Loading...</div>
      ) : (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <Card title="App" value={`${data.app_name} v${data.version}`} />
          <Card title="Chain connected" value={data.chain_connected ? "Yes ✅" : "No ❌"} />
          <Card title="Chain ID" value={String(data.chain_id)} />
          <Card title="Latest block" value={String(data.latest_block)} />
        </div>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 12, color: "#666" }}>{title}</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function Box({ children}: { children: React.ReactNode; tone: "danger" }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, border: "1px solid #f3c", marginBottom: 12 }}>
      {children}
    </div>
  );
}