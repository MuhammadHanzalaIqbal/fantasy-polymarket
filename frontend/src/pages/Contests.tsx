import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { api } from "../services/api";
import type { ContestResponse } from "../services/api";
import { formatCompactNumber, formatFtk, formatTimestamp } from "../utils/format";

function getContestState(contest: ContestResponse) {
  const now = Date.now() / 1000;

  if (contest.resolved) {
    return {
      label: "COMPLETED",
      color: "gray",
      locked: true,
    };
  }

  if (now >= Number(contest.lock_time)) {
    return {
      label: "LOCKED",
      color: "yellow",
      locked: true,
    };
  }

  return {
    label: "OPEN",
    color: "green",
    locked: false,
  };
}

export default function Contests() {
  const [contests, setContests] = useState<ContestResponse[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.contests().then(setContests).catch((e) => setErr(e.message ?? String(e)));
  }, []);

  const openCount = useMemo(() => {
    const now = Date.now() / 1000;
    return contests.filter((c) => !c.resolved && now < Number(c.lock_time)).length;
  }, [contests]);

  const resolvedCount = useMemo(
    () => contests.filter((c) => c.resolved).length,
    [contests]
  );

  const sortedContests = useMemo(() => {
    const now = Date.now() / 1000;
    return [...contests].sort((a, b) => {
      const aOpen = !a.resolved && now < Number(a.lock_time);
      const bOpen = !b.resolved && now < Number(b.lock_time);
      if (aOpen && !bOpen) return -1;
      if (!aOpen && bOpen) return 1;
      const aLocked = !a.resolved && now >= Number(a.lock_time);
      const bLocked = !b.resolved && now >= Number(b.lock_time);
      if (aLocked && !bLocked) return -1;
      if (!aLocked && bLocked) return 1;
      return Number(b.contest_id) - Number(a.contest_id);
    });
  }, [contests]);

  const featuredContest = sortedContests[0] ?? null;
  const featuredState = featuredContest ? getContestState(featuredContest) : null;

  return (
    <Stack gap="xl">
      <Paper
        radius={28}
        p="xl"
        style={{
          background:
            "linear-gradient(rgba(7,10,14,0.42), rgba(7,10,14,0.78)), url('/images/csgo-fire.jpg') center/cover no-repeat",
          border: "1px solid rgba(255,255,255,0.08)",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.30)",
        }}
      >
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
        <Grid align="center">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="md">
              <Group gap="xs">
                <Badge color="orange" variant="light" radius="xl">
                  LIVE TOURNAMENTS
                </Badge>
                <Badge color="yellow" variant="light" radius="xl">
                  MAJOR EVENTS
                </Badge>
                <Badge color="blue" variant="light" radius="xl">
                  CS2 LEAGUE
                </Badge>
              </Group>

              <div>
                <Text
                  c="white"
                  fw={950}
                  style={{
                    fontSize: "clamp(28px, 5vw, 48px)",
                    lineHeight: 1.04,
                    letterSpacing: -1,
                  }}
                >
                  Enter tactical tournaments.
                  <br />
                  Climb the standings.
                  <br />
                  Win the Major.
                </Text>
                <Text mt="md" size="md" c="rgba(255,255,255,0.72)" maw={700}>
                  Browse active tournaments, compare buy-ins and prize pools,
                  then deploy your saved squad for a shot at the top of the table.
                </Text>
              </div>

              <Group mt="sm">
                <Button
                  radius="xl"
                  disabled
                  styles={{
                    root: {
                      fontWeight: 900,
                      background:
                        "linear-gradient(135deg, #ff8a3d 0%, #ffb347 100%)",
                      color: "#101418",
                      opacity: 0.72,
                      cursor: "not-allowed",
                    },
                  }}
                >
                  Join Featured Major (Soon)
                </Button>
                <Button
                  radius="xl"
                  variant="light"
                  styles={{
                    root: {
                      fontWeight: 800,
                      background: "rgba(255,255,255,0.08)",
                      color: "white",
                      border: "1px solid rgba(255,255,255,0.08)",
                    },
                  }}
                >
                  View Standings
                </Button>
              </Group>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <MiniStat label="Total Tournaments" value={String(contests.length)} icon="🏆" />
              <MiniStat label="Open Tournaments" value={String(openCount)} icon="🟢" />
              <MiniStat label="Completed" value={String(resolvedCount)} icon="✅" />
            </Stack>
          </Grid.Col>
        </Grid>
      </Paper>

      {err && (
        <Paper
          radius={18}
          p="md"
          style={{
            border: "1px solid rgba(244,63,94,0.45)",
            background: "rgba(127,29,29,0.22)",
          }}
        >
          <Text c="#fecaca" fw={700}>
            {err}
          </Text>
        </Paper>
      )}

      {featuredContest && featuredState && (
        <Card radius={26} p="xl" style={panel}>
          <Group justify="space-between" align="flex-start" mb="lg">
            <div>
              <Text c="white" fw={950} size="xl">
                Featured Major #{featuredContest.contest_id}
              </Text>
              <Text size="sm" c="rgba(255,255,255,0.58)">
                Prime event spotlight for the current Counter-Strike tournament rotation.
              </Text>
            </div>

            <Badge
              radius="xl"
              color={featuredState.color}
              variant="light"
            >
              {featuredState.label}
            </Badge>
          </Group>

          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
            <MetricTile
              label="Buy-In"
              value={formatFtk(featuredContest.entry_fee)}
            />
            <MetricTile
              label="Team Slots"
              value={formatCompactNumber(featuredContest.max_entries)}
            />
            <MetricTile
              label="Prize Pool"
              value={formatFtk(featuredContest.total_pot)}
            />
            <MetricTile
              label="Platform Fee"
              value={formatCompactNumber(featuredContest.rake_bps)}
            />
          </SimpleGrid>

          <Group mt="lg">
            <Link
              to={`/contests/${featuredContest.contest_id}`}
              style={{ textDecoration: "none" }}
            >
              <Button
                radius="xl"
                styles={{
                  root: {
                    fontWeight: 900,
                    background:
                      "linear-gradient(135deg, #ff8a3d 0%, #ffb347 100%)",
                    color: "#101418",
                  },
                }}
              >
                Open Standings
              </Button>
            </Link>

            {featuredContest.resolved || featuredState.locked ? (
              <Button
                radius="xl"
                disabled
                variant="light"
                styles={{
                  root: {
                    fontWeight: 800,
                    background: "rgba(255,255,255,0.06)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.08)",
                    opacity: 0.65,
                    cursor: "not-allowed",
                  },
                }}
              >
                {featuredContest.resolved
                  ? "Tournament Closed"
                  : "Registration Closed"}
              </Button>
            ) : (
              <Link
                to={`/contests/${featuredContest.contest_id}`}
                style={{ textDecoration: "none" }}
              >
                <Button
                  radius="xl"
                  variant="light"
                  styles={{
                    root: {
                      fontWeight: 800,
                      background:
                        "linear-gradient(135deg, rgba(255,138,61,0.22), rgba(37,99,235,0.18))",
                      color: "white",
                      border: "1px solid rgba(255,255,255,0.12)",
                    },
                  }}
                >
                  Join Tournament
                </Button>
              </Link>
            )}
          </Group>
        </Card>
      )}

      <div>
        <Text c="white" fw={950} size="xl" mb={6}>
          Tournament Queue
        </Text>
        <Text size="sm" c="rgba(255,255,255,0.55)" mb="lg">
          Compare tournament conditions, inspect prize pools, and queue your squad for action.
        </Text>

        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="lg">
          {sortedContests.map((c) => {
            const state = getContestState(c);

            return (
              <Card key={c.contest_id} radius={24} p="xl" style={contestCard}>
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text c="white" fw={950} size="lg">
                        Major Event #{c.contest_id}
                      </Text>
                      <Text size="sm" c="rgba(255,255,255,0.50)">
                        Tactical CS tournament
                      </Text>
                    </div>

                    <Badge
                      radius="xl"
                      color={state.color}
                      variant="light"
                    >
                      {state.label}
                    </Badge>
                  </Group>

                  <Paper radius={18} p="md" style={innerPanel}>
                    <Group justify="space-between">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Text size="xs" tt="uppercase" fw={800} c="rgba(255,255,255,0.45)">
                          Prize Pool
                        </Text>
                        <Text
                          c="white"
                          fw={950}
                          size="xl"
                          style={{
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                          }}
                        >
                          {formatFtk(c.total_pot)}
                        </Text>
                      </div>

                      <ThemeIcon
                        radius="xl"
                        size={48}
                        variant="gradient"
                        gradient={{ from: "orange", to: "yellow", deg: 135 }}
                      >
                        🏆
                      </ThemeIcon>
                    </Group>
                  </Paper>

                  <SimpleGrid cols={2} spacing="sm">
                    <InfoTile label="Buy-In" value={formatFtk(c.entry_fee)} />
                    <InfoTile label="Team Slots" value={formatCompactNumber(c.max_entries)} />
                    <InfoTile label="Platform Fee" value={formatCompactNumber(c.rake_bps)} />
                    <InfoTile label="Tournament ID" value={String(c.contest_id)} />
                  </SimpleGrid>

                  <Stack gap={8}>
                    <Row k="Start Time" v={formatTimestamp(c.start_time)} />
                    <Row k="Registration Lock" v={formatTimestamp(c.lock_time)} />
                  </Stack>

                  <Group grow mt="xs">
                    <Link
                      to={`/contests/${c.contest_id}`}
                      style={{ textDecoration: "none", width: "100%" }}
                    >
                      <Button
                        fullWidth
                        radius="xl"
                        styles={{
                          root: {
                            fontWeight: 900,
                            background:
                              "linear-gradient(135deg, #ff8a3d 0%, #ffb347 100%)",
                            color: "#101418",
                          },
                        }}
                      >
                        Open Standings
                      </Button>
                    </Link>

                    {c.resolved || state.locked ? (
                      <Button
                        fullWidth
                        radius="xl"
                        disabled
                        variant="light"
                        styles={{
                          root: {
                            fontWeight: 800,
                            background: "rgba(255,255,255,0.06)",
                            color: "white",
                            border: "1px solid rgba(255,255,255,0.08)",
                            opacity: 0.65,
                            cursor: "not-allowed",
                          },
                        }}
                      >
                        {c.resolved ? "Tournament Closed" : "Registration Closed"}
                      </Button>
                    ) : (
                      <Link
                        to={`/contests/${c.contest_id}`}
                        style={{ textDecoration: "none", width: "100%" }}
                      >
                        <Button
                          fullWidth
                          radius="xl"
                          variant="light"
                          styles={{
                            root: {
                              fontWeight: 800,
                              background:
                                "linear-gradient(135deg, rgba(255,138,61,0.22), rgba(37,99,235,0.18))",
                              color: "white",
                              border: "1px solid rgba(255,255,255,0.12)",
                            },
                          }}
                        >
                          Join Tournament
                        </Button>
                      </Link>
                    )}
                  </Group>
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      </div>
    </Stack>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <Paper
      radius={20}
      p="md"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Group justify="space-between">
        <div>
          <Text size="xs" tt="uppercase" fw={800} c="rgba(255,255,255,0.45)">
            {label}
          </Text>
          <Text c="white" fw={950} size="xl">
            {value}
          </Text>
        </div>
        <Text size="xl">{icon}</Text>
      </Group>
    </Paper>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <Paper radius={18} p="md" style={innerPanel}>
      <Text size="xs" tt="uppercase" fw={800} c="rgba(255,255,255,0.45)">
        {label}
      </Text>
      <Text
        c="white"
        fw={950}
        size="xl"
        mt={4}
        style={{
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {value}
      </Text>
    </Paper>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <Paper
      radius={16}
      p="sm"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        minWidth: 0,
      }}
    >
      <Text size="xs" tt="uppercase" fw={800} c="rgba(255,255,255,0.42)">
        {label}
      </Text>
      <Text
        c="white"
        fw={850}
        mt={4}
        style={{
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {value}
      </Text>
    </Paper>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <Group
      justify="space-between"
      p="sm"
      style={{
        borderRadius: 16,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        gap: 12,
      }}
    >
      <Text size="sm" c="rgba(255,255,255,0.55)">
        {k}
      </Text>
      <Text
        size="sm"
        c="white"
        fw={700}
        style={{
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          textAlign: "right",
        }}
      >
        {v}
      </Text>
    </Group>
  );
}

const panel: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const innerPanel: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const contestCard: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
};