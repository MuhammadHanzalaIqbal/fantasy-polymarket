import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { api } from "../services/api";
import type {
  LeaderboardEntryResponse,
  PortfolioResponse,
} from "../services/api";
import { useWallet } from "../context/WalletContext";
import { sendIntentTransaction, waitForReceipt } from "../services/tx";
import { formatPlayerId, formatShares } from "../utils/format";

const panel: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const innerPanel: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
  overflow: "hidden",
};

const paperStyle = {
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.24), rgba(22,163,74,0.18), rgba(8,18,34,0.95))",
  border: "1px solid rgba(255,255,255,0.08)",
  position: "relative" as const,
  overflow: "hidden" as const,
};

export default function ContestDetail() {
  const { contestId } = useParams();
  const cid = useMemo(() => Number(contestId), [contestId]);
  const { address, connect } = useWallet();

  const [rows, setRows] = useState<LeaderboardEntryResponse[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const txBusy = status !== null && !status.includes("confirmed");

  const ownedPlayers = useMemo(() => {
    if (!portfolio?.player_shares) return [];
    return Object.entries(portfolio.player_shares)
      .filter(([, shares]) => shares > 0)
      .map(([id, shares]) => ({ playerId: Number(id), shares }))
      .sort((a, b) => a.playerId - b.playerId);
  }, [portfolio]);

  async function load() {
    try {
      setErr(null);
      const data = await api.leaderboard(cid);
      setRows(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function loadPortfolio(wallet: string) {
    setPortfolioLoading(true);
    setErr(null);
    try {
      let p: PortfolioResponse;
      try {
        p = await api.mePortfolio(wallet);
      } catch {
        p = await api.portfolio(wallet);
      }
      setPortfolio(p);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
      setPortfolio(null);
    } finally {
      setPortfolioLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [cid]);

  useEffect(() => {
    if (address) {
      loadPortfolio(address);
    } else {
      setPortfolio(null);
      setSelectedPlayers([]);
    }
  }, [address]);

  function togglePlayer(playerId: number) {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((p) => p !== playerId)
        : [...prev, playerId]
    );
  }

  async function enterContest() {
    try {
      setErr(null);

      let wallet = address;
      if (!wallet) {
        await connect();
        wallet = (window as unknown as { ethereum?: { selectedAddress?: string } }).ethereum?.selectedAddress ?? null;
      }
      if (!wallet) throw new Error("Connect wallet first.");

      if (selectedPlayers.length === 0) {
        throw new Error("Select at least one player from your portfolio.");
      }

      setStatus("Building entry intent...");
      const intent = await api.contestEntryIntent(cid, {
        wallet_address: wallet,
        players: selectedPlayers,
      });

      setStatus("Waiting for wallet confirmation...");
      const hash = await sendIntentTransaction(wallet, intent.tx_intent);

      setStatus(`Submitted: ${hash}`);
      await waitForReceipt(hash);

      setStatus("Contest entry confirmed");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
      setStatus(null);
    }
  }

  return (
    <Stack gap="xl">
      <Paper radius={28} p="xl" style={paperStyle}>
        <Box
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(34,197,94,0.10)",
            filter: "blur(12px)",
          }}
        />
        <Group gap="xs" mb="sm">
          <Badge color="green" variant="light" radius="xl">
            CONTEST ENTRY
          </Badge>
          <Badge color="blue" variant="light" radius="xl">
            LEADERBOARD
          </Badge>
        </Group>
        <Text
          c="white"
          fw={950}
          style={{
            fontSize: "clamp(28px, 5vw, 48px)",
            lineHeight: 1.04,
            letterSpacing: -1,
          }}
        >
          Contest #{cid}
        </Text>
        <Text mt="md" size="md" c="rgba(255,255,255,0.68)" maw={700}>
          Enter your player lineup and join the pool.
        </Text>
        <Button
          component={Link}
          to="/contests"
          variant="light"
          radius="xl"
          mt="md"
          styles={{
            root: {
              fontWeight: 800,
              background: "rgba(255,255,255,0.08)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.08)",
            },
          }}
        >
          Back to contests
        </Button>
      </Paper>

      <Card radius={26} p="xl" style={panel}>
        <Stack gap="lg">
          <div>
            <Text c="white" fw={950} size="xl">
              Enter contest
            </Text>
            <Text size="sm" c="rgba(255,255,255,0.55)">
              Select players from your portfolio to build your lineup.
            </Text>
          </div>

          {!address ? (
            <Paper radius={18} p="lg" style={innerPanel}>
              <Text c="rgba(255,255,255,0.7)">
                Connect your wallet to see and select players you own.
              </Text>
            </Paper>
          ) : portfolioLoading ? (
            <Paper radius={18} p="lg" style={innerPanel}>
              <Text c="rgba(255,255,255,0.7)">Loading your portfolio...</Text>
            </Paper>
          ) : ownedPlayers.length === 0 ? (
            <Paper radius={18} p="lg" style={innerPanel}>
              <Text c="rgba(255,255,255,0.7)" mb="sm">
                You have no player shares. Trade to acquire shares first.
              </Text>
              <Button
                component={Link}
                to="/players"
                variant="light"
                size="sm"
                styles={{
                  root: {
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.9)",
                  },
                }}
              >
                Go to markets
              </Button>
            </Paper>
          ) : (
            <Stack gap="sm">
              <Text size="sm" fw={700} c="rgba(255,255,255,0.68)">
                Your players (select lineup)
              </Text>
              <Paper radius={18} p="md" style={innerPanel}>
                <Stack gap="xs">
                  {ownedPlayers.map(({ playerId, shares }) => (
                    <Checkbox
                      key={playerId}
                      label={
                        <Group gap="xs">
                          <Text c="white" fw={700}>
                            Player {formatPlayerId(playerId)}
                          </Text>
                          <Text size="sm" c="rgba(255,255,255,0.55)">
                            ({formatShares(shares)} shares)
                          </Text>
                        </Group>
                      }
                      checked={selectedPlayers.includes(playerId)}
                      onChange={() => togglePlayer(playerId)}
                      disabled={txBusy}
                      styles={{
                        label: {
                          color: "white",
                          cursor: txBusy ? "not-allowed" : "pointer",
                        },
                        body: {
                          alignItems: "center",
                        },
                      }}
                    />
                  ))}
                </Stack>
              </Paper>
            </Stack>
          )}

          <Button
            onClick={enterContest}
            loading={txBusy}
            disabled={
              txBusy ||
              !address ||
              ownedPlayers.length === 0 ||
              selectedPlayers.length === 0
            }
            radius="xl"
            styles={{
              root: {
                fontWeight: 900,
                background:
                  "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
                color: "white",
                boxShadow: "0 10px 28px rgba(22,163,74,0.30)",
              },
            }}
          >
            {address ? "Enter contest" : "Connect wallet + enter"}
          </Button>
        </Stack>
      </Card>

      {status && (
        <Alert
          color="green"
          radius={16}
          style={{ background: "rgba(34,197,94,0.15)" }}
        >
          {status}
        </Alert>
      )}
      {err && (
        <Alert
          color="red"
          radius={16}
          style={{ background: "rgba(239,68,68,0.15)" }}
        >
          {err}
        </Alert>
      )}

      <Card radius={26} p="xl" style={panel}>
        <Stack gap="md">
          <Text c="white" fw={950} size="xl">
            Leaderboard
          </Text>
          <Paper radius={18} style={innerPanel}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr 140px",
                padding: "14px 16px",
                background: "rgba(255,255,255,0.06)",
                fontWeight: 800,
                color: "white",
              }}
            >
              <div>Rank</div>
              <div>User</div>
              <div>Score</div>
            </div>
            {rows.length === 0 && !err && (
              <div
                style={{
                  padding: 24,
                  color: "rgba(255,255,255,0.5)",
                  textAlign: "center",
                }}
              >
                No entries
              </div>
            )}
            {rows.map((r) => (
              <div
                key={`${r.user}-${r.rank}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr 140px",
                  padding: "14px 16px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                <div>{r.rank}</div>
                <div style={{ fontFamily: "monospace" }}>{r.user}</div>
                <div style={{ fontWeight: 800 }}>{r.score}</div>
              </div>
            ))}
          </Paper>
        </Stack>
      </Card>
    </Stack>
  );
}
