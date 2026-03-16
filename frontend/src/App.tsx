import { NavLink, Route, Routes } from "react-router-dom";
import {
  AppShell,
  Group,
  Text,
  TextInput,
  Button,
  Stack,
  Box,
  Badge,
  ThemeIcon,
  Divider,
} from "@mantine/core";
// frontend/src/App.tsx
import { useState } from "react";
import { connectWallet } from "./services/wallet";

import Home from "./pages/Home";
import Players from "./pages/Players";
import PlayerMarket from "./pages/PlayerMarket";
import Contests from "./pages/Contests";
import ContestDetail from "./pages/ContestDetail";
import Portfolio from "./pages/Portfolio";
import Admin from "./pages/Admin";
import { useWallet } from "./context/WalletContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: "🏟️" },
  { to: "/players", label: "Markets", icon: "📈" },
  { to: "/contests", label: "Contests", icon: "🏆" },
  { to: "/portfolio", label: "Portfolio", icon: "👤" },
  { to: "/admin", label: "Admin", icon: "🛡️" },
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
      padding="lg"
      header={{ height: 82 }}
      navbar={{ width: 300, breakpoint: "sm" }}
      styles={{
        root: {
          background:
            "radial-gradient(circle at top left, rgba(37,99,235,0.18), transparent 28%), radial-gradient(circle at top right, rgba(22,163,74,0.14), transparent 24%), #07111F",
        },
        header: {
          background: "rgba(7,17,31,0.88)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
        },
        navbar: {
          background:
            "linear-gradient(180deg, rgba(8,19,36,0.98), rgba(7,17,31,0.98))",
          borderRight: "1px solid rgba(255,255,255,0.08)",
        },
        main: {
          background: "transparent",
        },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="lg" justify="space-between">
          <Group gap="md">
            <Box
              w={46}
              h={46}
              style={{
                borderRadius: 16,
                background:
                  "linear-gradient(135deg, #16A34A 0%, #2563EB 100%)",
                boxShadow: "0 12px 30px rgba(37,99,235,0.35)",
              }}
            />
            <div>
              <Text fw={900} size="lg" c="white" style={{ letterSpacing: 0.3 }}>
                FANTASY SPORTSBOOK
              </Text>
              <Text size="xs" c="rgba(255,255,255,0.60)">
                Trade players. Enter contests. Build your edge.
              </Text>
            </div>
          </Group>

          <Group gap="sm">
            <TextInput
              placeholder="Search players, contests..."
              w={380}
              visibleFrom="md"
              styles={{
                input: {
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  color: "white",
                },
              }}
            />

            <Badge
              size="lg"
              radius="xl"
              styles={{
                root: {
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.08)",
                  paddingInline: 14,
                },
              }}
            >
              NETWORK: LOCAL
            </Badge>

            <Button
              onClick={onConnectWallet}
              styles={{
                root: {
                  borderRadius: 16,
                  fontWeight: 900,
                  background:
                    "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
                  color: "white",
                  boxShadow: "0 10px 26px rgba(22,163,74,0.35)",
                },
              }}
            >
              {walletLabel}
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack justify="space-between" h="100%">
          <div>
            <Group gap="xs" mb="md">
              <ThemeIcon
                radius="xl"
                size={34}
                variant="gradient"
                gradient={{ from: "green", to: "blue", deg: 135 }}
              >
                ⚡
              </ThemeIcon>
              <div>
                <Text c="white" fw={900} size="sm">
                  Fantasy Arena
                </Text>
                <Text size="xs" c="rgba(255,255,255,0.55)">
                  On-chain sports trading
                </Text>
              </div>
            </Group>

            <Text
              size="xs"
              fw={900}
              tt="uppercase"
              style={{ letterSpacing: 1.4 }}
              c="rgba(255,255,255,0.45)"
              mb="sm"
            >
              Navigation
            </Text>

            <Stack gap={10}>
              {navItems.map((it) => (
                <Button
                  key={it.to}
                  component={NavLink}
                  to={it.to}
                  variant="transparent"
                  justify="flex-start"
                  leftSection={<span style={{ fontSize: 18 }}>{it.icon}</span>}
                  styles={{
                    root: {
                      height: 52,
                      borderRadius: 16,
                      fontWeight: 900,
                      color: "white",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                    },
                  }}
                >
                  {it.label}
                </Button>
              ))}
            </Stack>

            <Divider my="lg" color="rgba(255,255,255,0.08)" />
          </div>

          <Box
            p="md"
            style={{
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(37,99,235,0.18), rgba(22,163,74,0.10))",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <Text fw={900} size="md" c="white">
              Mega Contest Mode
            </Text>
            <Text size="xs" c="rgba(255,255,255,0.65)" mt={6}>
              Enter live contests, track player prices, and build your winning
              fantasy portfolio.
            </Text>

            <Group mt="md" gap="xs">
              <Badge color="green" variant="light">
                LIVE
              </Badge>
              <Badge color="blue" variant="light">
                ON-CHAIN
              </Badge>
              <Badge color="yellow" variant="light">
                MVP
              </Badge>
            </Group>

            <Button
              fullWidth
              mt="md"
              disabled
              styles={{
                root: {
                  borderRadius: 16,
                  fontWeight: 900,
                  background:
                    "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
                  color: "white",
                  opacity: 0.65,
                  cursor: "not-allowed",
                },
              }}
            >
              Open Bet Slip (Soon)
            </Button>
          </Box>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box
          style={{
            minHeight: "calc(100vh - 120px)",
            borderRadius: 28,
            background:
              "linear-gradient(180deg, rgba(12,24,44,0.96), rgba(8,18,34,0.98))",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
            padding: 28,
          }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/players" element={<Players />} />
            <Route path="/players/:playerId" element={<PlayerMarket />} />
            <Route path="/contests" element={<Contests />} />
            <Route path="/contests/:contestId" element={<ContestDetail />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}