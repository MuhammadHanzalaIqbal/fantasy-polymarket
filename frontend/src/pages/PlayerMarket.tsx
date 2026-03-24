import { useMemo, useRef, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { api } from "../services/api";
import type { QuoteResponse, QuoteSide } from "../services/api";
import { useWallet } from "../context/WalletContext";
import {
  sendApproveTransaction,
  sendIntentTransaction,
  waitForReceipt,
} from "../services/tx";
import { formatFtk, humanToWei } from "../utils/format";
import { playersData } from "../data/players_data";

function normalizePlayerId(playerId: string | number | undefined) {
  if (!playerId) return 0;
  const numericId = Number(playerId);
  return numericId >= 10 ** 18 ? Math.floor(numericId / 10 ** 18) : numericId;
}

type ManualPlayerMeta = {
  name: string;
  team?: string;
  role?: string;
  country?: string;
  image?: string;
};

export default function PlayerMarket() {
  const { playerId } = useParams();
  const pid = useMemo(() => Number(playerId), [playerId]);
  const rawId = useMemo(() => normalizePlayerId(playerId), [playerId]);
  const meta = (playersData as Record<number, ManualPlayerMeta>)[rawId];

  const { address, connect } = useWallet();
  const actionLockRef = useRef(false);

  const [side, setSide] = useState<QuoteSide>("buy");
  const [amount, setAmount] = useState<number>(1);
  const [slippageBps, setSlippageBps] = useState<number>(100);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [txBusy, setTxBusy] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  async function getQuote() {
    if (actionLockRef.current || quoteLoading || txBusy) return;

    setErr(null);
    setQuote(null);
    setQuoteLoading(true);

    try {
      const q = await api.marketQuote(pid, side, humanToWei(amount));
      setQuote(q);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setQuoteLoading(false);
    }
  }

  async function executeTrade() {
    if (actionLockRef.current) return;
    actionLockRef.current = true;

    setTxBusy(true);
    setErr(null);
    setTxHash(null);
    setTxStatus(null);

    try {
      let wallet = address;
      if (!wallet) {
        await connect();
        wallet = (window as any).ethereum?.selectedAddress || null;
      }
      if (!wallet) throw new Error("Connect wallet first.");

      setTxStatus("Building trade intent...");
      let intent = await api.tradeIntent(pid, {
        wallet_address: wallet,
        side,
        amount: humanToWei(amount),
        slippage_bps: slippageBps,
      });

      if (intent.approval_sufficient === false) {
        if (
          !intent.approval_token ||
          !intent.approval_spender ||
          !intent.required_allowance_wei
        ) {
          throw new Error("Approval is required, but approval metadata is missing.");
        }

        setTxStatus("Approval required. Confirm approval in wallet...");
        const approveHash = await sendApproveTransaction({
          from: wallet,
          tokenAddress: intent.approval_token,
          spender: intent.approval_spender,
          amount: intent.required_allowance_wei,
          chainId: intent.tx_intent.chain_id,
        });

        setTxHash(approveHash);
        setTxStatus("Approval submitted. Waiting for confirmation...");
        await waitForReceipt(approveHash);

        setTxStatus("Approval confirmed. Rebuilding trade intent...");
        intent = await api.tradeIntent(pid, {
          wallet_address: wallet,
          side,
          amount: humanToWei(amount),
          slippage_bps: slippageBps,
        });
      }

      if (intent.approval_sufficient === false) {
        throw new Error(
          "Approval still not sufficient after confirmation. Refresh and try again."
        );
      }

      setTxStatus("Confirm trade in wallet...");
      const tradeHash = await sendIntentTransaction(wallet, intent.tx_intent);
      setTxHash(tradeHash);

      setTxStatus("Trade submitted. Waiting for confirmation...");
      await waitForReceipt(tradeHash);

      setTxStatus("Trade confirmed ✅");
      await getQuote();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setTxStatus(null);
    } finally {
      actionLockRef.current = false;
      setTxBusy(false);
    }
  }

  const disableActions = !pid || amount <= 0 || quoteLoading || txBusy;

  return (
    <Stack gap="xl">
      <Paper
        radius={28}
        p="xl"
        style={{
          background:
            "linear-gradient(rgba(7,10,14,0.42), rgba(7,10,14,0.78)), url('/images/csgo-dark.jpg') center/cover no-repeat",
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 24px 80px rgba(0,0,0,0.30)",
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
            background: "rgba(255,138,61,0.12)",
            filter: "blur(12px)",
          }}
        />

        <Group justify="space-between" align="flex-start" gap="xl">
          <div style={{ flex: 1 }}>
            <Group gap="xs" mb="sm">
              <Badge color="orange" variant="light" radius="xl">
                LIVE MARKET
              </Badge>
              <Badge color="blue" variant="light" radius="xl">
                PLAYER VALUE
              </Badge>
              <Badge color="yellow" variant="light" radius="xl">
                TRADE TERMINAL
              </Badge>
            </Group>

            <Group gap="md" align="center" mb="md" wrap="wrap">
              <Avatar
                radius="xl"
                size={84}
                src={meta?.image || undefined}
                alt={`${meta?.name || `Player ${rawId}`} avatar`}
                styles={{
                  root: {
                    background:
                      "linear-gradient(135deg, rgba(255,138,61,0.9), rgba(37,99,235,0.9))",
                    border: "1px solid rgba(255,255,255,0.12)",
                  },
                }}
              >
                🎯
              </Avatar>

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
                  {meta?.name || `Player #${rawId}`}
                  <br />
                  transfer terminal
                </Text>

                <Text mt={6} size="md" c="rgba(255,255,255,0.68)">
                  {meta
                    ? [meta.team, meta.role, meta.country].filter(Boolean).join(" • ")
                    : `Player ID ${rawId}`}
                </Text>
              </div>
            </Group>

            <Text mt="md" size="md" c="rgba(255,255,255,0.66)" maw={700}>
              Get a quote, approve FTK if required, then execute your buy or sell
              directly from your connected wallet.
            </Text>
          </div>

          <Stack gap="md" miw={220}>
            <MiniStat label="Mode" value={side.toUpperCase()} icon="📈" />
            <MiniStat label="Amount" value={String(amount)} icon="🎯" />
            <MiniStat label="Slippage" value={`${slippageBps} bps`} icon="⚙️" />
          </Stack>
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Card radius={26} p="xl" style={panel}>
          <Stack gap="lg">
            <div>
              <Text c="white" fw={950} size="xl">
                Trade Setup
              </Text>
              <Text size="sm" c="rgba(255,255,255,0.55)">
                Choose side, trade amount, and slippage tolerance.
              </Text>
            </div>

            <div>
              <Text size="sm" fw={800} c="rgba(255,255,255,0.68)" mb={8}>
                Trade Side
              </Text>
              <SegmentedControl
                fullWidth
                radius="xl"
                value={side}
                onChange={(value) => setSide(value as QuoteSide)}
                data={[
                  { label: "Buy", value: "buy" },
                  { label: "Sell", value: "sell" },
                ]}
                disabled={txBusy}
                styles={{
                  root: {
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  },
                  indicator: {
                    background:
                      "linear-gradient(135deg, #ff8a3d 0%, #ffb347 100%)",
                  },
                  label: {
                    color: "white",
                    fontWeight: 800,
                  },
                }}
              />
            </div>

            <NumberInput
              label="Amount (FTK)"
              value={amount}
              onChange={(value) => setAmount(Number(value) ?? 0)}
              min={0.001}
              step={0.1}
              description="e.g. 1 or 1.5"
              disabled={txBusy}
              styles={darkInputStyles}
            />

            <NumberInput
              label="Slippage (bps)"
              value={slippageBps}
              onChange={(value) => setSlippageBps(Number(value) || 0)}
              min={0}
              max={5000}
              disabled={txBusy}
              styles={darkInputStyles}
            />

            <Group>
              <Button
                onClick={getQuote}
                disabled={disableActions}
                loading={quoteLoading}
                radius="xl"
                styles={{
                  root: {
                    fontWeight: 900,
                    background: "rgba(255,255,255,0.08)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.08)",
                  },
                }}
              >
                {quoteLoading ? "Loading..." : txBusy ? "Busy..." : "Get Quote"}
              </Button>

              <Button
                onClick={executeTrade}
                disabled={disableActions}
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
                {txBusy
                  ? "Processing..."
                  : address
                  ? "Execute Trade"
                  : "Connect Wallet + Trade"}
              </Button>
            </Group>
          </Stack>
        </Card>

        <Card radius={26} p="xl" style={panel}>
          <Stack gap="lg">
            <div>
              <Text c="white" fw={950} size="xl">
                Quote Preview
              </Text>
              <Text size="sm" c="rgba(255,255,255,0.55)">
                Preview current pricing before opening the wallet.
              </Text>
            </div>

            {quote ? (
              <SimpleGrid cols={2} spacing="md">
                <MetricTile
                  label="Estimated Output"
                  value={formatFtk(quote.estimated_amount_out)}
                />
                <MetricTile
                  label="Reference Price (FTK)"
                  value={formatFtk(quote.reference_price_wei)}
                />
                <MetricTile
                  label="Amount In (FTK)"
                  value={formatFtk(quote.amount_in)}
                />
                <MetricTile label="Trade Side" value={quote.side.toUpperCase()} />
              </SimpleGrid>
            ) : (
              <Paper radius={18} p="lg" style={innerPanel}>
                <Text c="rgba(255,255,255,0.60)" fw={600}>
                  No quote loaded yet. Generate a quote to preview market output.
                </Text>
              </Paper>
            )}

            <Paper radius={18} p="lg" style={innerPanel}>
              <Text c="white" fw={900} mb="sm">
                Trade Notes
              </Text>
              <Stack gap={8}>
                <InfoLine text="Buy trades may require FTK approval before execution." />
                <InfoLine text="Sell trades require player share balance in your wallet." />
                <InfoLine text="Quotes are estimates and can move with market state." />
              </Stack>
            </Paper>
          </Stack>
        </Card>
      </SimpleGrid>

      <Card radius={26} p="xl" style={panel}>
        <Stack gap="md">
          <div>
            <Text c="white" fw={950} size="xl">
              Transaction Feed
            </Text>
            <Text size="sm" c="rgba(255,255,255,0.55)">
              Monitor approval, trade submission, and confirmation progress.
            </Text>
          </div>

          {txStatus && (
            <Paper radius={18} p="md" style={statusPanel}>
              <Text c="white" fw={800}>
                {txStatus}
              </Text>
            </Paper>
          )}

          {txHash && (
            <Paper radius={18} p="md" style={innerPanel}>
              <Text size="xs" tt="uppercase" fw={800} c="rgba(255,255,255,0.42)">
                Transaction Hash
              </Text>
              <Text
                c="white"
                fw={700}
                mt={6}
                style={{
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                }}
              >
                {txHash}
              </Text>
            </Paper>
          )}

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

          {!txStatus && !txHash && !err && (
            <Paper radius={18} p="md" style={innerPanel}>
              <Text c="rgba(255,255,255,0.60)" fw={600}>
                No active transaction yet. Generate a quote and execute your trade.
              </Text>
            </Paper>
          )}
        </Stack>
      </Card>
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

function InfoLine({ text }: { text: string }) {
  return (
    <Group gap="sm" wrap="nowrap">
      <ThemeIcon radius="xl" size={24} color="blue" variant="light">
        •
      </ThemeIcon>
      <Text c="rgba(255,255,255,0.72)" size="sm">
        {text}
      </Text>
    </Group>
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

const statusPanel: CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(255,138,61,0.14), rgba(37,99,235,0.14))",
  border: "1px solid rgba(255,255,255,0.08)",
};

const darkInputStyles = {
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
