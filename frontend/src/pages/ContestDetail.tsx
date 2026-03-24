import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Paper,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { api } from "../services/api";
import type { LeaderboardEntryResponse, TeamResponse } from "../services/api";
import { useWallet } from "../context/WalletContext";
import { sendIntentTransaction, waitForReceipt } from "../services/tx";
import { formatPlayerId } from "../utils/format";
import { playersData } from "../data/players_data";

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
    "linear-gradient(135deg, rgba(255,138,61,0.14), rgba(37,99,235,0.18), rgba(8,18,34,0.95))",
  border: "1px solid rgba(255,255,255,0.08)",
  position: "relative" as const,
  overflow: "hidden" as const,
};

const selectStyles = {
  label: {
    color: "rgba(255,255,255,0.68)",
    marginBottom: 6,
    fontWeight: 700,
  },
  input: {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "white",
  },
  dropdown: {
    background: "#0b1628",
    border: "1px solid rgba(255,255,255,0.08)",
  },
};

type ManualPlayerMeta = {
  name: string;
  team?: string;
  role?: string;
  country?: string;
  image?: string;
};

function normalizePlayerId(playerId: number | string) {
  const numericId = Number(playerId);
  return numericId >= 10 ** 18 ? Math.floor(numericId / 10 ** 18) : numericId;
}

function extractPlayerIdFromError(message: string): number | null {
  const match = message.match(/player\s+(\d+)/i);
  if (!match) return null;
  return normalizePlayerId(match[1]);
}

export default function ContestDetail() {
  const { contestId } = useParams();
  const cid = useMemo(() => Number(contestId), [contestId]);
  const { address, connect } = useWallet();

  const [rows, setRows] = useState<LeaderboardEntryResponse[]>([]);
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [entryErrorPlayer, setEntryErrorPlayer] = useState<ManualPlayerMeta | null>(null);

  const txBusy = status !== null && !status.includes("confirmed");
  const selectedTeam = useMemo(
    () =>
      teams.find((team) => String(team.team_id) === String(selectedTeamId)) ?? null,
    [selectedTeamId, teams]
  );

  const loadLeaderboard = useCallback(async () => {
    try {
      setErr(null);
      const data = await api.leaderboard(cid);
      setRows(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [cid]);

  const loadTeams = useCallback(async (wallet: string) => {
    setTeamsLoading(true);
    setErr(null);
    try {
      const response = await api.listTeams(wallet);
      setTeams(response);
      if (response.length > 0) {
        setSelectedTeamId((previous) =>
          previous && response.some((team) => String(team.team_id) === previous)
            ? previous
            : String(response[0].team_id)
        );
      } else {
        setSelectedTeamId(null);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    if (address) {
      loadTeams(address);
    } else {
      setTeams([]);
      setSelectedTeamId(null);
    }
  }, [address, loadTeams]);

  async function enterContest() {
    try {
      setErr(null);
      setEntryErrorPlayer(null);

      let wallet = address;
      if (!wallet) {
        await connect();
        wallet = (
          window as unknown as {
            ethereum?: { selectedAddress?: string };
          }
        ).ethereum?.selectedAddress ?? null;
      }
      if (!wallet) throw new Error("Connect wallet first.");

      if (!selectedTeamId) {
        throw new Error("Select a team before entering the contest.");
      }

      setStatus("Building entry intent...");
      const intent = await api.contestEntryIntent(cid, {
        wallet_address: wallet,
        team_id: Number(selectedTeamId),
      });

      setStatus("Waiting for wallet confirmation...");
      const hash = await sendIntentTransaction(wallet, intent.tx_intent);

      setStatus(`Submitted: ${hash}`);
      await waitForReceipt(hash);

      setStatus("Contest entry confirmed");
      await loadLeaderboard();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setErr(message);
      setStatus(null);

      const rawId = extractPlayerIdFromError(message);
      if (rawId) {
        const meta = (playersData as Record<number, ManualPlayerMeta>)[rawId];
        setEntryErrorPlayer(meta ?? null);
      } else {
        setEntryErrorPlayer(null);
      }
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
            background: "rgba(255,138,61,0.10)",
            filter: "blur(12px)",
          }}
        />
        <Group gap="xs" mb="sm">
          <Badge color="orange" variant="light" radius="xl">
            CONTEST ENTRY
          </Badge>
          <Badge color="blue" variant="light" radius="xl">
            TEAM QUEUE
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
          Tournament #{cid}
        </Text>
        <Text mt="md" size="md" c="rgba(255,255,255,0.68)" maw={700}>
          Select one of your saved squads and queue into the event.
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
          Back to tournaments
        </Button>
      </Paper>

      <Card radius={26} p="xl" style={panel}>
        <Stack gap="lg">
          <div>
            <Text c="white" fw={950} size="xl">
              Enter contest
            </Text>
            <Text size="sm" c="rgba(255,255,255,0.55)">
              Contest entry is team-based. Choose one of your saved teams.
            </Text>
          </div>

          {!address ? (
            <Paper radius={18} p="lg" style={innerPanel}>
              <Text c="rgba(255,255,255,0.7)">
                Connect your wallet to load and select your saved teams.
              </Text>
            </Paper>
          ) : teamsLoading ? (
            <Paper radius={18} p="lg" style={innerPanel}>
              <Text c="rgba(255,255,255,0.7)">Loading your teams...</Text>
            </Paper>
          ) : teams.length === 0 ? (
            <Paper radius={18} p="lg" style={innerPanel}>
              <Text c="rgba(255,255,255,0.7)" mb="sm">
                You do not have any saved teams yet.
              </Text>
              <Group gap="sm">
                <Button
                  component={Link}
                  to="/teams"
                  variant="light"
                  size="sm"
                  styles={{
                    root: {
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.9)",
                    },
                  }}
                >
                  Create team
                </Button>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => address && loadTeams(address)}
                  styles={{
                    root: {
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.8)",
                    },
                  }}
                >
                  Refresh
                </Button>
              </Group>
            </Paper>
          ) : (
            <Stack gap="sm">
              <Text size="sm" fw={700} c="rgba(255,255,255,0.68)">
                Team selection
              </Text>
              <Paper radius={18} p="md" style={innerPanel}>
                <Stack gap="md">
                  <Select
                    label="Saved team"
                    data={teams.map((team) => ({
                      value: String(team.team_id),
                      label: `#${team.team_id} - ${team.name}`,
                    }))}
                    value={selectedTeamId}
                    onChange={setSelectedTeamId}
                    disabled={txBusy}
                    styles={selectStyles}
                  />

                  {selectedTeam && (
                    <Stack gap="sm">
                      <Text c="white" fw={800}>
                        Selected team roster
                      </Text>

                      {selectedTeam.members
                        .sort((a, b) => a.slot_index - b.slot_index)
                        .map((member) => {
                          const rawId = normalizePlayerId(member.player_id);
                          const meta =
                            (playersData as Record<number, ManualPlayerMeta>)[rawId];

                          return (
                            <Group
                              key={`${selectedTeam.team_id}-${member.slot_index}`}
                              gap="md"
                              align="center"
                              wrap="nowrap"
                            >
                              <Badge radius="xl" color="blue" variant="light">
                                SLOT {member.slot_index + 1}
                              </Badge>

                              <Avatar
                                radius="xl"
                                size={46}
                                src={meta?.image || undefined}
                                alt={`${meta?.name || `Player ${rawId}`} avatar`}
                                styles={{
                                  root: {
                                    background:
                                      "linear-gradient(135deg, rgba(255,138,61,0.9), rgba(37,99,235,0.9))",
                                  },
                                }}
                              >
                                🎯
                              </Avatar>

                              <div style={{ flex: 1 }}>
                                <Text c="white" fw={800}>
                                  {meta?.name || `Player ${formatPlayerId(member.player_id)}`}
                                </Text>
                                <Text size="sm" c="rgba(255,255,255,0.58)">
                                  {meta
                                    ? [meta.team, meta.country].filter(Boolean).join(" • ")
                                    : `ID ${formatPlayerId(member.player_id)}`}
                                </Text>
                              </div>

                              <Text size="sm" c="rgba(255,255,255,0.7)" fw={700}>
                                {member.role_label}
                              </Text>
                            </Group>
                          );
                        })}
                    </Stack>
                  )}
                </Stack>
              </Paper>
            </Stack>
          )}

          <Button
            onClick={enterContest}
            loading={txBusy}
            disabled={txBusy || !address || teams.length === 0 || !selectedTeamId}
            radius="xl"
            styles={{
              root: {
                fontWeight: 900,
                background:
                  "linear-gradient(135deg, #ff8a3d 0%, #ffb347 100%)",
                color: "#101418",
                boxShadow: "0 10px 28px rgba(255,138,61,0.28)",
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
          {entryErrorPlayer ? (
            <Group gap="md" wrap="nowrap">
              <Avatar
                radius="xl"
                size={52}
                src={entryErrorPlayer.image || undefined}
                alt={entryErrorPlayer.name}
                styles={{
                  root: {
                    background:
                      "linear-gradient(135deg, rgba(255,138,61,0.9), rgba(37,99,235,0.9))",
                  },
                }}
              >
                🎯
              </Avatar>

              <div>
                <Text c="white" fw={800}>
                  You do not own shares of {entryErrorPlayer.name}.
                </Text>
                <Text size="sm" c="rgba(255,255,255,0.72)">
                  {[
                    entryErrorPlayer.team,
                    entryErrorPlayer.role,
                    entryErrorPlayer.country,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </Text>
              </div>
            </Group>
          ) : (
            <Text>{err}</Text>
          )}
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
