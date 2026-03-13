// frontend/src/App.tsx
import { NavLink, Route, Routes } from "react-router-dom";
import { useState } from "react";
import { connectWallet } from "./services/wallet";

import { AppShell, Group, Text, TextInput, Button, Stack, Box, Badge } from "@mantine/core";

import Home from "./pages/Home";
import Players from "./pages/Players";
import PlayerMarket from "./pages/PlayerMarket";
import Contests from "./pages/Contests";
import ContestLeaderboard from "./pages/ContestLeaderboard";
import Portfolio from "./pages/Portfolio";

const navItems = [
  { to: "/", label: "Dashboard", icon: "🏠" },
  { to: "/players", label: "Markets", icon: "📈" },
  { to: "/contests", label: "Contests", icon: "🏆" },
  { to: "/portfolio", label: "Portfolio", icon: "👤" },
];

export default function App() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [walletErr, setWalletErr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  async function onConnectWallet() {
    try {
      setConnecting(true);
      setWalletErr(null);
      const addr = await connectWallet();
      setWallet(addr);
    } catch (e: any) {
      setWallet(null);
      setWalletErr(e?.message ?? String(e));
    } finally {
      setConnecting(false);
    }
  }

  const walletLabel = wallet
    ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}`
    : "Connect Wallet";

  return (
    <AppShell
      padding="md"
      header={{ height: 76 }}
      navbar={{ width: 290, breakpoint: "sm" }}
      styles={{
        header: { background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" },
        navbar: { background: "#0F172A", borderRight: "1px solid rgba(255,255,255,0.08)" },
        main: { background: "#F8FAFC" },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Box
              w={40}
              h={40}
              style={{
                borderRadius: 14,
                background: "linear-gradient(135deg, #16A34A, #2563EB)",
              }}
            />
            <div>
              <Text fw={950} size="sm" c="#0F172A">
                FANTASY SPORTSBOOK
              </Text>
              <Text size="xs" c="#64748B">
                Premium light sportsbook UI
              </Text>
            </div>
          </Group>

          <Group gap="sm">
            <TextInput
              placeholder="Search players, contests..."
              w={420}
              visibleFrom="md"
              styles={{
                input: { borderRadius: 14, borderColor: "#E2E8F0", background: "#FFFFFF" },
              }}
            />
            <Badge
              variant="light"
              color="gray"
              styles={{ root: { borderRadius: 999, background: "#F1F5F9", color: "#0F172A" } }}
            >
              Network: Local
            </Badge>

            <Button
              onClick={onConnectWallet}
              loading={connecting}
              styles={{
                root: { borderRadius: 14, fontWeight: 900, background: "#16A34A" },
              }}
            >
              {walletLabel}
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Text size="xs" fw={900} tt="uppercase" style={{ letterSpacing: 1.2 }} c="rgba(255,255,255,0.65)">
          Navigation
        </Text>

        <Stack gap={10} mt="sm">
          {navItems.map((it) => (
            <Button
              key={it.to}
              component={NavLink}
              to={it.to}
              variant="transparent"
              justify="flex-start"
              leftSection={<span style={{ fontSize: 16 }}>{it.icon}</span>}
              styles={{
                root: {
                  borderRadius: 14,
                  fontWeight: 900,
                  padding: "12px 14px",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                },
              }}
            >
              {it.label}
            </Button>
          ))}
        </Stack>

        <Box
          mt="lg"
          p="md"
          style={{
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
          }}
        >
          <Text fw={900} size="sm" c="white">
            Bet Slip
          </Text>
          <Text size="xs" c="rgba(255,255,255,0.65)" mt={6}>
            Add selections from Markets and place a simulated bet slip.
          </Text>
          <Button
            fullWidth
            mt="sm"
            styles={{
              root: {
                borderRadius: 14,
                fontWeight: 900,
                background: "rgba(22,163,74,0.18)",
                color: "#E6FFF3",
                border: "1px solid rgba(22,163,74,0.35)",
              },
            }}
          >
            Open Bet Slip
          </Button>
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>
        <div
          style={{
            borderRadius: 18,
            background: "white",
            border: "1px solid #E2E8F0",
            boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
            padding: 22,
            minHeight: "calc(100vh - 110px)",
          }}
        >
          {walletErr && (
            <div
              style={{
                border: "1px solid #FCA5A5",
                background: "#FEF2F2",
                color: "#991B1B",
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 14,
              }}
            >
              {walletErr}
            </div>
          )}

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/players" element={<Players />} />
            <Route path="/players/:playerId" element={<PlayerMarket />} />
            <Route path="/contests" element={<Contests />} />
            <Route path="/contests/:contestId" element={<ContestLeaderboard />} />
            <Route path="/portfolio" element={<Portfolio />} />
          </Routes>
        </div>
      </AppShell.Main>
    </AppShell>
  );
}