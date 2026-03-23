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
  BackgroundImage,
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
            "linear-gradient(rgba(7,10,14,0.40), rgba(7,10,14,0.78)), url('/images/csgo-hero.jpg') center/cover no-repeat",
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
            background: "rgba(255,138,61,0.10)",
            filter: "blur(10px)",
          }}
        />

        <Grid align="center">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="md">
              <Group gap="xs">
                <Badge color="orange" variant="light" radius="xl">
                  LIVE OPERATION
                </Badge>
                <Badge color="blue" variant="light" radius="xl">
                  COUNTER-STRIKE
                </Badge>
                <Badge color="yellow" variant="light" radius="xl">
                  MAJOR READY
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
                  Scout the market.
                  <br />
                  Win the Major.
                </Text>

                <Text
                  mt="md"
                  size="md"
                  c="rgba(255,255,255,0.76)"
                  maw={640}
                >
                  Counter-Strike League transforms your competitive roster flow
                  into a tactical on-chain experience. Track player value, build
                  your five-stack, and enter tournaments from one Home.
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
                        "linear-gradient(135deg, #ff8a3d 0%, #ffb347 100%)",
                      color: "#101418",
                      boxShadow: "0 10px 28px rgba(255,138,61,0.28)",
                    },
                  }}
                >
                  View Live Tournaments
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
                  Open Players
                </Button>
              </Group>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <HeroStat
                label="Majors"
                value="Tournament Queue"
                sub="Track active brackets, buy-ins, and current event status"
                icon="🏆"
              />
              <HeroStat
                label="Market Intel"
                value="Player Value Board"
                sub="Scan liquidity, pricing, and player market movement"
                icon="💹"
              />
              <HeroStat
                label="Roster Control"
                value="Five-Stack Builder"
                sub="Create and save tactical lineups for tournament entry"
                icon="🛡️"
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
            Loading Home...
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
                      Featured Operation
                    </Text>
                    <Text size="sm" c="rgba(255,255,255,0.55)">
                      Your tactical loop: scout, assemble, enter, climb.
                    </Text>
                  </div>
                  <Badge color="orange" variant="light" radius="xl">
                    HOT
                  </Badge>
                </Group>

                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                  <FeatureCard
                    icon="🎯"
                    title="Scout Player Market"
                    text="Review current player value, inspect market depth, and pick your next roster target."
                  />
                  <FeatureCard
                    icon="🏆"
                    title="Join Tournaments"
                    text="Enter live events with your saved five-stack and fight up the standings."
                  />
                  <FeatureCard
                    icon="📊"
                    title="Track Inventory"
                    text="Monitor FTK balance, player exposure, and transaction activity from your wallet."
                  />
                </SimpleGrid>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Card radius={24} p="xl" style={panel}>
                <Text c="white" fw={900} size="xl" mb="md">
                  Server Status
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
                    label="Market Engine"
                    value="Ready"
                    tone="blue"
                  />
                  <StatusRow
                    label="Tournament Queue"
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
                  Mission Checklist
                </Text>
                <Text size="sm" c="rgba(255,255,255,0.55)" mb="lg">
                  Suggested test flow for the full CS league experience.
                </Text>

                <Stack gap="sm">
                  <ChecklistItem text="Connect your wallet" done />
                  <ChecklistItem text="Check FTK balance in inventory" />
                  <ChecklistItem text="Scan player prices on market page" />
                  <ChecklistItem text="Build your five-stack in squads" />
                  <ChecklistItem text="Enter a tournament and review standings" />
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card radius={24} p="xl" style={panel}>
                <Text c="white" fw={900} size="xl" mb="xs">
                  League Pulse
                </Text>
                <Text size="sm" c="rgba(255,255,255,0.55)" mb="lg">
                  Counter-Strike League is online and ready for tactical testing.
                </Text>

                <SimpleGrid cols={2} spacing="md">
                  <PulseMiniCard label="Market State" value="Live" />
                  <PulseMiniCard label="Wallet Flow" value="Enabled" />
                  <PulseMiniCard label="Tournament Mode" value="Ready" />
                  <PulseMiniCard label="Admin" value="Available" />
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
          gradient={{ from: "orange", to: "yellow", deg: 135 }}
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