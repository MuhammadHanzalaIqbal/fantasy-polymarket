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
          Select one of your saved teams and join the pool.
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
                    <Stack gap="xs">
                      <Text c="white" fw={800}>
                        Selected team roster
                      </Text>
                      {selectedTeam.members
                        .sort((a, b) => a.slot_index - b.slot_index)
                        .map((member) => (
                          <Group
                            key={`${selectedTeam.team_id}-${member.slot_index}`}
                            gap="xs"
                          >
                            <Badge radius="xl" color="blue" variant="light">
                              Slot {member.slot_index + 1}
                            </Badge>
                            <Text c="white" fw={700}>
                              Player {formatPlayerId(member.player_id)}
                            </Text>
                            <Text size="sm" c="rgba(255,255,255,0.6)">
                              {member.role_label}
                            </Text>
                          </Group>
                        ))}
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
