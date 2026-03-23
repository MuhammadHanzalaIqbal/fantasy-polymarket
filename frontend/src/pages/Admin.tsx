import { useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { api } from "../services/api";
import {
  formatMoscowFromUnix,
  humanToPlayerId,
  humanToWei,
  nowUnixSeconds,
  parseMoscowToUnix,
} from "../utils/format";

export default function Admin() {
  const [apiKey, setApiKey] = useState("");

  const [playerId, setPlayerId] = useState(1);
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [entryFee, setEntryFee] = useState(0);
  const [maxEntries, setMaxEntries] = useState(10);
  const [startTimeStr, setStartTimeStr] = useState("");
  const [lockTimeStr, setLockTimeStr] = useState("");
  const [prizeBps, setPrizeBps] = useState("7000,2000,1000");

  const [resolveContestId, setResolveContestId] = useState(1);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<
    "player" | "contest" | "resolve" | null
  >(null);

  async function createPlayer() {
    try {
      setErr(null);
      setMsg(null);
      setLoading("player");
      const res = await api.adminCreatePlayer(
        {
          player_id: humanToPlayerId(playerId),
          token_name: tokenName,
          token_symbol: tokenSymbol,
          avatar_url: avatarUrl.trim() || undefined,
        },
        apiKey
      );
      setMsg(`Player created/listed: ${JSON.stringify(res)}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  async function createContest() {
    const startTime = parseMoscowToUnix(startTimeStr);
    const lockTime = parseMoscowToUnix(lockTimeStr);
    if (startTime === null) {
      setErr("Invalid start time. Use DD.MM.YYYY HH:mm");
      return;
    }
    if (lockTime === null) {
      setErr("Invalid lock time. Use DD.MM.YYYY HH:mm");
      return;
    }
    if (lockTime >= startTime) {
      setErr("Registration lock must be before tournament start.");
      return;
    }
    const prizeBpsNums = prizeBps.split(",").map((x) => Number(x.trim()));
    const prizeSum = prizeBpsNums.reduce((a, b) => a + b, 0);
    if (prizeSum !== 10000) {
      setErr(`Prize BPS must sum to 10000. Current sum: ${prizeSum}`);
      return;
    }
    try {
      setErr(null);
      setMsg(null);
      setLoading("contest");
      const res = await api.adminCreateContest(
        {
          entry_fee: humanToWei(entryFee),
          max_entries: maxEntries,
          start_time: startTime,
          lock_time: lockTime,
          prize_bps: prizeBpsNums,
        },
        apiKey
      );
      setMsg(`Tournament created: ${res.tx_hash}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      setMsg(null);
    } finally {
      setLoading(null);
    }
  }

  async function resolveContest() {
    try {
      setErr(null);
      setMsg(null);
      setLoading("resolve");
      const res = await api.adminResolveContest(resolveContestId, apiKey);
      setMsg(`Tournament resolved: ${res.tx_hash}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  const paperStyle = {
    background:
      "linear-gradient(rgba(7,10,14,0.42), rgba(7,10,14,0.78)), url('/images/admin.jpg') center/cover no-repeat",
    border: "1px solid rgba(255,255,255,0.08)",
    position: "relative" as const,
    overflow: "hidden" as const,
    boxShadow: "0 24px 80px rgba(0,0,0,0.30)",
  };

  const inputStyles = {
    label: {
      color: "rgba(255,255,255,0.68)",
      marginBottom: 6,
      fontWeight: 700,
    },
    description: {
      color: "rgba(255,255,255,0.5)",
    },
    input: {
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.04)",
      color: "white",
    },
  };

  const sectionStyle = {
    background: "rgba(0,0,0,0.24)",
    border: "1px solid rgba(255,255,255,0.06)",
    backdropFilter: "blur(8px)",
  };

  const actionBtn = {
    root: {
      borderRadius: 16,
      fontWeight: 900,
      background: "linear-gradient(135deg, #ff8a3d 0%, #ffb347 100%)",
      color: "#101418",
    },
  };

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

        <Stack gap="xs" mb="md">
          <Group gap="xs">
            <Badge color="orange" variant="light" radius="xl">
              CONTROL ROOM
            </Badge>
            <Badge color="blue" variant="light" radius="xl">
              ADMIN
            </Badge>
            <Badge color="yellow" variant="light" radius="xl">
              LIVE CONFIG
            </Badge>
          </Group>

          <Text
            c="white"
            fw={950}
            style={{
              fontSize: "clamp(24px, 4vw, 40px)",
              letterSpacing: -0.5,
            }}
          >
            Control Room
          </Text>
          <Text size="sm" c="rgba(255,255,255,0.70)">
            Create player markets, open tournaments, and resolve completed events.
            Requires API key access.
          </Text>
        </Stack>

        <Paper p="md" radius={16} mb="md" style={sectionStyle}>
          <Text size="sm" fw={700} c="white" mb="xs">
            Admin API key
          </Text>
          <TextInput
            value={apiKey}
            onChange={(e) => setApiKey(e.currentTarget.value)}
            placeholder="X-API-Key (e.g. demo-key)"
            styles={inputStyles}
          />
        </Paper>

        <Paper p="md" radius={16} mb="md" style={sectionStyle}>
          <Text size="sm" fw={700} c="white" mb="xs">
            Create player market
          </Text>
          <Stack gap="sm">
            <NumberInput
              label="Player ID"
              value={playerId}
              onChange={(v) => setPlayerId(Number(v) || 0)}
              min={1}
              description="Stored as 5e18 on-chain"
              styles={inputStyles}
            />
            <TextInput
              label="Token name"
              value={tokenName}
              onChange={(e) => setTokenName(e.currentTarget.value)}
              placeholder="e.g. Player 1"
              styles={inputStyles}
            />
            <TextInput
              label="Token symbol"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.currentTarget.value)}
              placeholder="e.g. P1"
              styles={inputStyles}
            />
            <TextInput
              label="Avatar URL (optional)"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.currentTarget.value)}
              placeholder="https://cdn.example.com/player-1.png"
              description="Saved as off-chain player metadata."
              styles={inputStyles}
            />
            <Button
              onClick={createPlayer}
              loading={loading === "player"}
              disabled={!apiKey.trim()}
              styles={actionBtn}
            >
              Create player
            </Button>
          </Stack>
        </Paper>

        <Paper p="md" radius={16} mb="md" style={sectionStyle}>
          <Text size="sm" fw={700} c="white" mb="xs">
            Create tournament
          </Text>
          <Stack gap="sm">
            <NumberInput
              label="Buy-In (FTK)"
              value={entryFee}
              onChange={(v) => setEntryFee(Number(v) || 0)}
              min={0}
              step={0.1}
              decimalScale={2}
              description="Enter amount in FTK"
              styles={inputStyles}
            />
            <NumberInput
              label="Team slots"
              value={maxEntries}
              onChange={(v) => setMaxEntries(Number(v) || 0)}
              min={1}
              styles={inputStyles}
            />
            <Box>
              <TextInput
                label="Registration lock (Moscow)"
                value={lockTimeStr}
                onChange={(e) => setLockTimeStr(e.currentTarget.value)}
                placeholder="DD.MM.YYYY HH:mm"
                description="Must be before tournament start"
                styles={inputStyles}
              />
              <Button
                size="xs"
                variant="subtle"
                mt={6}
                onClick={() =>
                  setLockTimeStr(formatMoscowFromUnix(nowUnixSeconds()))
                }
                styles={{
                  root: {
                    color: "rgba(255,255,255,0.7)",
                    fontWeight: 600,
                  },
                }}
              >
                Set to now
              </Button>
            </Box>
            <Box>
              <TextInput
                label="Tournament start (Moscow)"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.currentTarget.value)}
                placeholder="DD.MM.YYYY HH:mm"
                description="Must be after lock"
                styles={inputStyles}
              />
              <Button
                size="xs"
                variant="subtle"
                mt={6}
                onClick={() => {
                  const now = nowUnixSeconds();
                  setStartTimeStr(formatMoscowFromUnix(now + 3600));
                }}
                styles={{
                  root: {
                    color: "rgba(255,255,255,0.7)",
                    fontWeight: 600,
                  },
                }}
              >
                Set to now + 1 hour
              </Button>
              <Button
                size="xs"
                variant="light"
                mt={6}
                ml={8}
                onClick={() => {
                  const now = nowUnixSeconds();
                  setLockTimeStr(formatMoscowFromUnix(now));
                  setStartTimeStr(formatMoscowFromUnix(now + 3600));
                }}
                styles={{
                  root: {
                    color: "rgba(255,138,61,0.95)",
                    fontWeight: 700,
                    background: "rgba(255,255,255,0.08)",
                  },
                }}
              >
                Set both
              </Button>
            </Box>
            <TextInput
              label="Prize BPS"
              value={prizeBps}
              onChange={(e) => setPrizeBps(e.currentTarget.value)}
              placeholder="7000,2000,1000"
              description="Must sum to 10000"
              styles={inputStyles}
            />
            <Button
              onClick={createContest}
              loading={loading === "contest"}
              disabled={!apiKey.trim()}
              styles={actionBtn}
            >
              Create tournament
            </Button>
          </Stack>
        </Paper>

        <Paper p="md" radius={16} mb="md" style={sectionStyle}>
          <Text size="sm" fw={700} c="white" mb="xs">
            Resolve tournament
          </Text>
          <Stack gap="sm">
            <NumberInput
              label="Tournament ID"
              value={resolveContestId}
              onChange={(v) => setResolveContestId(Number(v) || 0)}
              min={1}
              styles={inputStyles}
            />
            <Button
              onClick={resolveContest}
              loading={loading === "resolve"}
              disabled={!apiKey.trim()}
              styles={actionBtn}
            >
              Resolve tournament
            </Button>
          </Stack>
        </Paper>

        {msg && (
          <Alert color="green" radius={16} style={{ background: "rgba(34,197,94,0.15)" }}>
            {msg}
          </Alert>
        )}
        {err && (
          <Alert color="red" radius={16} style={{ background: "rgba(239,68,68,0.15)" }}>
            {err}
          </Alert>
        )}
      </Paper>
    </Stack>
  );
}