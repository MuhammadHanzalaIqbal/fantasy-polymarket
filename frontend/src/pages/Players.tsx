import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { formatFtk, formatPlayerId, formatShares } from "../utils/format";
import {
  Avatar,
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
} from "@mantine/core";
import { api } from "../services/api";
import type { PlayerPoolResponse } from "../services/api";

export default function Players() {
  const [startId, setStartId] = useState(1);
  const [endId, setEndId] = useState(20);
  const [players, setPlayers] = useState<PlayerPoolResponse[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const data = await api.players(startId, endId);
      setPlayers(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listedCount = useMemo(
    () => players.filter((p) => p.exists).length,
    [players]
  );

  return (
    <Stack gap="xl">
      <Paper
        radius={28}
        p="xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(37,99,235,0.22), rgba(22,163,74,0.14), rgba(8,18,34,0.96))",
          border: "1px solid rgba(255,255,255,0.08)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          style={{
            position: "absolute",
            right: -50,
            top: -70,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(37,99,235,0.16)",
            filter: "blur(14px)",
          }}
        />

        <Group justify="space-between" align="flex-start" gap="xl">
          <div>
            <Group gap="xs" mb="sm">
              <Badge color="green" variant="light" radius="xl">
                LIVE MARKETS
              </Badge>
              <Badge color="blue" variant="light" radius="xl">
                PLAYER SHARES
              </Badge>
              <Badge color="yellow" variant="light" radius="xl">
                FTK TRADING
              </Badge>
            </Group>

            <Text
              c="white"
              fw={950}
              style={{
                fontSize: "clamp(28px, 5vw, 46px)",
                lineHeight: 1.05,
                letterSpacing: -1,
              }}
            >
              Trade player exposure
              <br />
              like a fantasy market.
            </Text>

            <Text mt="md" size="md" c="rgba(255,255,255,0.66)" maw={720}>
              Browse listed player pools, compare liquidity and pricing, then
              jump into each market to execute your trade directly from your wallet.
            </Text>
          </div>

          <Stack gap="md" miw={220}>
            <MiniStat label="Tracked Players" value={String(players.length)} icon="📊" />
            <MiniStat label="Listed Pools" value={String(listedCount)} icon="🟢" />
          </Stack>
        </Group>
      </Paper>

      <Card radius={24} p="xl" style={panel}>
        <Group justify="space-between" align="flex-end" mb="lg">
          <div>
            <Text c="white" fw={950} size="xl">
              Market Filters
            </Text>
            <Text size="sm" c="rgba(255,255,255,0.55)">
              Set the player id range to scan active pools from the market contract.
            </Text>
          </div>

          <Badge color="blue" variant="light" radius="xl">
            Range Scan
          </Badge>
        </Group>

        <Group gap="md" wrap="wrap">
          <TextInput
            type="number"
            value={String(startId)}
            onChange={(e) => setStartId(Number(e.currentTarget.value))}
            label="Start ID"
            min={1}
            styles={darkInputStyles}
            w={160}
          />
          <TextInput
            type="number"
            value={String(endId)}
            onChange={(e) => setEndId(Number(e.currentTarget.value))}
            label="End ID"
            min={1}
            styles={darkInputStyles}
            w={160}
          />

          <Button
            onClick={load}
            loading={loading}
            radius="xl"
            mt={22}
            styles={{
              root: {
                fontWeight: 900,
                background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
                color: "white",
              },
            }}
          >
            {loading ? "Loading..." : "Reload Market Board"}
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

      <div>
        <Text c="white" fw={950} size="xl" mb={6}>
          Player Market Board
        </Text>
        <Text size="sm" c="rgba(255,255,255,0.55)" mb="lg">
          Open a player market to quote, approve FTK, and execute trades.
        </Text>

        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="lg">
          {players.map((p) => (
            <Card key={p.player_id} radius={24} p="xl" style={marketCard}>
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <Group gap="md" wrap="nowrap">
                    <Avatar
                      radius="xl"
                      size={52}
                      src={p.avatar_url ?? undefined}
                      alt={`Player ${formatPlayerId(p.player_id)} avatar`}
                      styles={{
                        root: {
                          background:
                            "linear-gradient(135deg, rgba(22,163,74,0.9), rgba(37,99,235,0.9))",
                        },
                      }}
                    >
                      ⚽
                    </Avatar>

                    <div>
                      <Text c="white" fw={950} size="lg">
                        Player #{formatPlayerId(p.player_id)}
                      </Text>
                      <Text size="sm" c="rgba(255,255,255,0.50)">
                        Fantasy player market
                      </Text>
                    </div>
                  </Group>

                  <Badge
                    radius="xl"
                    color={p.exists ? "green" : "red"}
                    variant="light"
                  >
                    {p.exists ? "LISTED" : "OFFLINE"}
                  </Badge>
                </Group>

                <Paper radius={18} p="md" style={innerPanel}>
                  <Group justify="space-between" align="flex-start">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text
                        size="xs"
                        tt="uppercase"
                        fw={800}
                        c="rgba(255,255,255,0.45)"
                      >
                        Share Price
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
                        {formatFtk(p.share_price_wei)}
                      </Text>
                    </div>

                    <Badge color="yellow" variant="light" radius="xl">
                      HOT
                    </Badge>
                  </Group>
                </Paper>

                <SimpleGrid cols={2} spacing="sm">
                  <InfoTile
                    label="Total Shares"
                    value={formatShares(p.total_shares)}
                  />
                  <InfoTile
                    label="FTK Liquidity"
                    value={formatFtk(p.ftk_liquidity)}
                  />
                  <InfoTile label="Player ID" value={formatPlayerId(p.player_id)} />
                  <InfoTile
                    label="Status"
                    value={p.exists ? "Active" : "Not Listed"}
                  />
                </SimpleGrid>

                <Group grow mt="xs">
                  <Link
                    to={`/players/${p.player_id}`}
                    style={{ textDecoration: "none", width: "100%" }}
                  >
                    <Button
                      fullWidth
                      radius="xl"
                      styles={{
                        root: {
                          fontWeight: 900,
                          background:
                            "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
                          color: "white",
                        },
                      }}
                    >
                      Open Market
                    </Button>
                  </Link>

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
                    Watchlist (Soon)
                  </Button>
                </Group>
              </Stack>
            </Card>
          ))}
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

const panel: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const innerPanel: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const marketCard: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
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
