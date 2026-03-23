import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { api } from "../services/api";
import type { PortfolioResponse } from "../services/api";
import { useWallet } from "../context/WalletContext";
import { formatFtk, formatPlayerId, formatShares } from "../utils/format";

export default function Portfolio() {
  const { address, connect } = useWallet();
  const [wallet, setWallet] = useState("");
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (address) {
      setWallet(address);
      load(address);
    }
  }, [address]);

  async function load(targetWallet?: string) {
    const finalWallet = (targetWallet || wallet).trim();
    if (!finalWallet) return;

    setErr(null);
    setData(null);
    setLoading(true);
    try {
      let p: PortfolioResponse;
      try {
        p = await api.mePortfolio(finalWallet);
      } catch {
        p = await api.portfolio(finalWallet);
      }
      setData(p);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  const shareEntries = useMemo(
    () => (data ? Object.entries(data.player_shares) : []),
    [data]
  );

  const totalPositions = shareEntries.length;

  return (
    <Stack gap="xl">
      <Paper
        radius={28}
        p="xl"
        style={{
          background:
            "linear-gradient(rgba(7,10,14,0.42), rgba(7,10,14,0.78)), url('/images/bg-main.jpg') center/cover no-repeat",
          border: "1px solid rgba(255,255,255,0.08)",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.30)",
        }}
      >
        <Box
          style={{
            position: "absolute",
            right: -60,
            top: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(255,138,61,0.10)",
            filter: "blur(14px)",
          }}
        />

        <Group justify="space-between" align="flex-start" gap="xl">
          <div>
            <Group gap="xs" mb="sm">
              <Badge color="orange" variant="light" radius="xl">
                INVENTORY
              </Badge>
              <Badge color="blue" variant="light" radius="xl">
                WALLET ASSETS
              </Badge>
              <Badge color="yellow" variant="light" radius="xl">
                LIVE HOLDINGS
              </Badge>
            </Group>

            <Text
              c="white"
              fw={950}
              style={{
                fontSize: "clamp(28px, 5vw, 48px)",
                lineHeight: 1.05,
                letterSpacing: -1,
              }}
            >
              Track your credits,
              <br />
              roster positions,
              <br />
              and tactical assets.
            </Text>

            <Text mt="md" size="md" c="rgba(255,255,255,0.70)" maw={720}>
              Connect your wallet, review FTK balance, and monitor all tracked
              player positions from one clean Counter-Strike inventory view.
            </Text>
          </div>

          <Stack gap="md" miw={220}>
            <MiniStat
              label="Wallet State"
              value={address ? "Connected" : "Offline"}
              icon="👛"
            />
            <MiniStat
              label="Positions"
              value={String(totalPositions)}
              icon="📦"
            />
            <MiniStat
              label="FTK Ready"
              value={data ? formatFtk(data.ftk_balance) : "--"}
              icon="🪙"
            />
          </Stack>
        </Group>
      </Paper>

      <Card radius={24} p="xl" style={panel}>
        <Group justify="space-between" align="flex-end" mb="lg">
          <div>
            <Text c="white" fw={950} size="xl">
              Wallet lookup
            </Text>
            <Text size="sm" c="rgba(255,255,255,0.55)">
              Load your connected wallet, or inspect another address manually.
            </Text>
          </div>

          <Badge color="blue" variant="light" radius="xl">
            Inventory Query
          </Badge>
        </Group>

        <Group gap="md" wrap="wrap">
          <TextInput
            value={wallet}
            onChange={(e) => setWallet(e.currentTarget.value)}
            placeholder="0x..."
            styles={darkInputStyles}
            w={420}
            maw="100%"
            label="Wallet Address"
          />

          <Button
            onClick={() => connect()}
            radius="xl"
            mt={22}
            styles={{
              root: {
                fontWeight: 900,
                background: "rgba(255,255,255,0.08)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.08)",
              },
            }}
          >
            {address ? "Wallet Connected" : "Connect Wallet"}
          </Button>

          <Button
            onClick={() => load()}
            disabled={loading || wallet.trim().length < 10}
            loading={loading}
            radius="xl"
            mt={22}
            styles={{
              root: {
                fontWeight: 900,
                background:
                  "linear-gradient(135deg, #ff8a3d 0%, #ffb347 100%)",
                color: "#101418",
              },
            }}
          >
            {loading ? "Loading..." : "Load Inventory"}
          </Button>
        </Group>
      </Card>

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

      {data && (
        <>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
            <StatCard
              title="Wallet"
              value={`${data.wallet_address.slice(0, 6)}…${data.wallet_address.slice(-4)}`}
              icon="👛"
            />
            <StatCard
              title="FTK Balance"
              value={formatFtk(data.ftk_balance)}
              icon="🪙"
            />
            <StatCard
              title="Tracked Positions"
              value={String(totalPositions)}
              icon="📊"
            />
          </SimpleGrid>

          <Card radius={26} p="xl" style={panel}>
            <Stack gap="md">
              <div>
                <Text c="white" fw={950} size="xl">
                  Wallet overview
                </Text>
                <Text size="sm" c="rgba(255,255,255,0.55)">
                  Core wallet identity and fungible token balance.
                </Text>
              </div>

              <Paper radius={18} p="lg" style={innerPanel}>
                <Text
                  size="xs"
                  tt="uppercase"
                  fw={800}
                  c="rgba(255,255,255,0.42)"
                >
                  Wallet Address
                </Text>
                <Text
                  c="white"
                  fw={800}
                  mt={6}
                  style={{ fontFamily: "monospace", wordBreak: "break-all" }}
                >
                  {data.wallet_address}
                </Text>

                <Group mt="lg" justify="space-between">
                  <div>
                    <Text
                      size="xs"
                      tt="uppercase"
                      fw={800}
                      c="rgba(255,255,255,0.42)"
                    >
                      FTK Balance
                    </Text>
                    <Text c="white" fw={950} size="xl" mt={4}>
                      {formatFtk(data.ftk_balance)}
                    </Text>
                  </div>

                  <ThemeIcon
                    radius="xl"
                    size={52}
                    variant="gradient"
                    gradient={{ from: "orange", to: "yellow", deg: 135 }}
                  >
                    🪙
                  </ThemeIcon>
                </Group>
              </Paper>
            </Stack>
          </Card>

          <Card radius={26} p="xl" style={panel}>
            <Stack gap="md">
              <div>
                <Text c="white" fw={950} size="xl">
                  Active positions
                </Text>
                <Text size="sm" c="rgba(255,255,255,0.55)">
                  Review your currently held player market exposure.
                </Text>
              </div>

              {shareEntries.length === 0 ? (
                <Paper radius={18} p="lg" style={innerPanel}>
                  <Text c="rgba(255,255,255,0.62)" fw={600}>
                    No active positions yet. Buy into a player market to build
                    your first roster asset.
                  </Text>
                </Paper>
              ) : (
                <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
                  {shareEntries.map(([pid, amt]) => (
                    <Paper
                      key={pid}
                      radius={20}
                      p="lg"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <Group justify="space-between" mb="md">
                        <div>
                          <Text
                            size="xs"
                            tt="uppercase"
                            fw={800}
                            c="rgba(255,255,255,0.42)"
                          >
                            Player Market
                          </Text>
                          <Text c="white" fw={950} size="lg">
                            Player {formatPlayerId(pid)}
                          </Text>
                        </div>

                        <Badge color="green" variant="light" radius="xl">
                          ACTIVE
                        </Badge>
                      </Group>

                      <Text
                        size="xs"
                        tt="uppercase"
                        fw={800}
                        c="rgba(255,255,255,0.42)"
                      >
                        Shares Held
                      </Text>
                      <Text c="white" fw={950} size="xl" mt={4}>
                        {formatShares(amt)}
                      </Text>
                    </Paper>
                  ))}
                </SimpleGrid>
              )}
            </Stack>
          </Card>
        </>
      )}
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

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
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
            background: "rgba(255,138,61,0.16)",
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

const panel: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(10px)",
};

const innerPanel: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const darkInputStyles = {
  label: {
    color: "rgba(255,255,255,0.68)",
    marginBottom: 6,
    fontWeight: 700,
  },
  input: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "white",
  },
};