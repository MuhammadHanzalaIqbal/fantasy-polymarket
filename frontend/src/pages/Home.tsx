import { useEffect, useState, type CSSProperties } from "react";
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
import type { HealthResponse } from "../services/api";

export default function Home() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.health().then(setData).catch((e) => setErr(e.message ?? String(e)));
  }, []);

  return (
    <Stack gap="xl">
      <Paper
        radius={28}
        p="xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(37,99,235,0.28), rgba(22,163,74,0.20), rgba(8,18,34,0.96))",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Box
          style={{
            position: "absolute",
            right: -80,
            top: -80,
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "rgba(34,197,94,0.10)",
            filter: "blur(10px)",
          }}
        />
        <Box
          style={{
            position: "absolute",
            right: 80,
            bottom: -90,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(37,99,235,0.14)",
            filter: "blur(12px)",
          }}
        />

        <Grid align="center">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="md">
              <Group gap="xs">
                <Badge color="green" variant="light" radius="xl">
                  LIVE MVP
                </Badge>
                <Badge color="blue" variant="light" radius="xl">
                  ON-CHAIN FANTASY
                </Badge>
                <Badge color="yellow" variant="light" radius="xl">
                  SPORTS MARKET
                </Badge>
              </Group>

              <div>
                <Text
                  c="white"
                  fw={950}
                  style={{
                    fontSize: "clamp(28px, 5vw, 52px)",
                    lineHeight: 1.02,
                    letterSpacing: -1.2,
                  }}
                >
                  Build your squad.
                  <br />
                  Trade player shares.
                  <br />
                  Win contests.
                </Text>

                <Text
                  mt="md"
                  size="md"
                  c="rgba(255,255,255,0.70)"
                  maw={640}
                >
                  Fantasy Sportsbook turns sports players into tradable on-chain
                  markets. Buy player exposure, manage your FTK, and enter
                  contests with a real fantasy trading workflow.
                </Text>
              </div>

              <Group mt="sm">
                <Button
                  component={Link}
                  to="/contests"
                  radius="xl"
                  size="md"
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
                  Enter Live Contests
                </Button>

                <Button
                  component={Link}
                  to="/players"
                  radius="xl"
                  size="md"
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
                  Explore Markets
                </Button>
              </Group>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <HeroStat
                label="Prize Pools"
                value="Mega Contests"
                sub="Compete in leaderboard-based fantasy contests"
                icon="🏆"
              />
              <HeroStat
                label="Trade Engine"
                value="Player Markets"
                sub="Buy and sell player share exposure using FTK"
                icon="📈"
              />
              <HeroStat
                label="Portfolio"
                value="On-chain Holdings"
                sub="Track wallet balances, shares, and contest activity"
                icon="💼"
              />
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

      {!data ? (
        <Paper
          radius={22}
          p="xl"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <Text c="rgba(255,255,255,0.75)" fw={700}>
            Loading fantasy dashboard...
          </Text>
        </Paper>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
            <StatCard
              title="App"
              value={`${data.app_name} v${data.version}`}
              icon="⚙️"
              tone="blue"
            />
            <StatCard
              title="Chain Connected"
              value={data.chain_connected ? "YES" : "NO"}
              icon={data.chain_connected ? "🟢" : "🔴"}
              tone={data.chain_connected ? "green" : "red"}
            />
            <StatCard
              title="Chain ID"
              value={String(data.chain_id ?? "N/A")}
              icon="⛓️"
              tone="blue"
            />
            <StatCard
              title="Latest Block"
              value={String(data.latest_block ?? "N/A")}
              icon="📦"
              tone="green"
            />
          </SimpleGrid>

          <Grid>
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <Card radius={24} p="xl" style={panel}>
                <Group justify="space-between" mb="lg">
                  <div>
                    <Text c="white" fw={900} size="xl">
                      Featured Fantasy Arena
                    </Text>
                    <Text size="sm" c="rgba(255,255,255,0.55)">
                      Your core game loop: trade, enter contests, track results.
                    </Text>
                  </div>
                  <Badge color="green" variant="light" radius="xl">
                    HOT
                  </Badge>
                </Group>

                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                  <FeatureCard
                    icon="🎯"
                    title="Trade Player Markets"
                    text="Open player pages, preview quotes, and execute buy/sell flows from your connected wallet."
                  />
                  <FeatureCard
                    icon="🏆"
                    title="Join Contests"
                    text="Enter fantasy contests using your selected player set and compete on live scoreboards."
                  />
                  <FeatureCard
                    icon="📊"
                    title="Track Portfolio"
                    text="Monitor FTK balance, player shares, and portfolio performance from your connected wallet."
                  />
                </SimpleGrid>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Card radius={24} p="xl" style={panel}>
                <Text c="white" fw={900} size="xl" mb="md">
                  Matchday Status
                </Text>

                <Stack gap="sm">
                  <StatusRow
                    label="Backend API"
                    value="Online"
                    tone="green"
                  />
                  <StatusRow
                    label="Chain Sync"
                    value={data.chain_connected ? "Connected" : "Offline"}
                    tone={data.chain_connected ? "green" : "red"}
                  />
                  <StatusRow
                    label="Trading Engine"
                    value="Ready"
                    tone="blue"
                  />
                  <StatusRow
                    label="Contest Engine"
                    value="Available"
                    tone="green"
                  />
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card radius={24} p="xl" style={panel}>
                <Text c="white" fw={900} size="xl" mb="xs">
                  Daily Objectives
                </Text>
                <Text size="sm" c="rgba(255,255,255,0.55)" mb="lg">
                  Suggested flow for testing the app end-to-end.
                </Text>

                <Stack gap="sm">
                  <ChecklistItem text="Connect your wallet" done />
                  <ChecklistItem text="Check FTK balance in portfolio" />
                  <ChecklistItem text="Approve FTK spending when prompted" />
                  <ChecklistItem text="Buy player shares from market page" />
                  <ChecklistItem text="Enter a contest and watch leaderboard" />
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card radius={24} p="xl" style={panel}>
                <Text c="white" fw={900} size="xl" mb="xs">
                  League Pulse
                </Text>
                <Text size="sm" c="rgba(255,255,255,0.55)" mb="lg">
                  Fantasy Sportsbook MVP is online and ready for testing.
                </Text>

                <SimpleGrid cols={2} spacing="md">
                  <PulseMiniCard label="Market State" value="Live" />
                  <PulseMiniCard label="Wallet Flow" value="Enabled" />
                  <PulseMiniCard label="Contest Mode" value="Ready" />
                  <PulseMiniCard label="Admin Tools" value="Available" />
                </SimpleGrid>
              </Card>
            </Grid.Col>
          </Grid>
        </>
      )}
    </Stack>
  );
}

function HeroStat({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
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
      <Group align="flex-start" wrap="nowrap">
        <ThemeIcon
          radius="xl"
          size={44}
          variant="gradient"
          gradient={{ from: "green", to: "blue", deg: 135 }}
        >
          <span>{icon}</span>
        </ThemeIcon>
        <div>
          <Text size="xs" tt="uppercase" fw={800} c="rgba(255,255,255,0.45)">
            {label}
          </Text>
          <Text c="white" fw={900} size="lg">
            {value}
          </Text>
          <Text size="xs" c="rgba(255,255,255,0.60)">
            {sub}
          </Text>
        </div>
      </Group>
    </Paper>
  );
}

function StatCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: string;
  tone: "green" | "blue" | "red";
}) {
  const toneMap = {
    green: "rgba(34,197,94,0.15)",
    blue: "rgba(37,99,235,0.16)",
    red: "rgba(244,63,94,0.16)",
  };

  return (
    <Card
      radius={22}
      p="lg"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Group justify="space-between" mb="md">
        <Text size="sm" c="rgba(255,255,255,0.55)" fw={700}>
          {title}
        </Text>
        <Box
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            background: toneMap[tone],
          }}
        >
          <span style={{ fontSize: 18 }}>{icon}</span>
        </Box>
      </Group>

      <Text c="white" fw={950} style={{ fontSize: "clamp(22px, 3vw, 30px)" }}>
        {value}
      </Text>
    </Card>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <Paper
      radius={20}
      p="lg"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        height: "100%",
      }}
    >
      <Text size="xl" mb="sm">
        {icon}
      </Text>
      <Text c="white" fw={850} mb={6}>
        {title}
      </Text>
      <Text size="sm" c="rgba(255,255,255,0.58)">
        {text}
      </Text>
    </Paper>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "blue" | "red";
}) {
  return (
    <Group
      justify="space-between"
      p="sm"
      style={{
        borderRadius: 16,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Text c="rgba(255,255,255,0.62)" fw={700}>
        {label}
      </Text>
      <Badge color={tone} variant="light" radius="xl">
        {value}
      </Badge>
    </Group>
  );
}

function ChecklistItem({
  text,
  done = false,
}: {
  text: string;
  done?: boolean;
}) {
  return (
    <Group
      p="sm"
      style={{
        borderRadius: 16,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <ThemeIcon
        radius="xl"
        color={done ? "green" : "gray"}
        variant="light"
      >
        {done ? "✓" : "•"}
      </ThemeIcon>
      <Text c="white" fw={600}>
        {text}
      </Text>
    </Group>
  );
}

function PulseMiniCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Paper
      radius={18}
      p="md"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Text size="xs" tt="uppercase" fw={800} c="rgba(255,255,255,0.45)">
        {label}
      </Text>
      <Text c="white" fw={900} size="lg" mt={6}>
        {value}
      </Text>
    </Paper>
  );
}

const panel: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};
