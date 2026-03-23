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
  Divider,
  BackgroundImage,
} from "@mantine/core";
import { useState } from "react";
import { connectWallet } from "./services/wallet";

import Home from "./pages/Home";
import Players from "./pages/Players";
import PlayerMarket from "./pages/PlayerMarket";
import Contests from "./pages/Contests";
import ContestDetail from "./pages/ContestDetail";
import Portfolio from "./pages/Portfolio";
import Admin from "./pages/Admin";
import Teams from "./pages/Teams";

const navItems = [
  { to: "/", label: "Home", icon: "🎯" },
  { to: "/players", label: "Players", icon: "💹" },
  { to: "/contests", label: "Tournaments", icon: "🏆" },
  { to: "/teams", label: "Squads", icon: "🛡️" },
  { to: "/portfolio", label: "Inventory", icon: "🎒" },
  { to: "/admin", label: "Admin", icon: "⚙️" },
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
    } catch (e: unknown) {
      setWallet(null);
      setWalletErr(e instanceof Error ? e.message : String(e));
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
            "linear-gradient(rgba(4,7,12,0.74), rgba(4,7,12,0.9)), url('/images/csgo-dark.jpg') center/cover no-repeat fixed",
        },
        header: {
          background: "rgba(5, 9, 14, 0.82)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(14px)",
        },
        navbar: {
          background:
            "linear-gradient(180deg, rgba(8,12,18,0.96), rgba(6,10,14,0.98))",
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
            <BackgroundImage
              src="/images/csgo-fire.jpg"
              radius={16}
              w={46}
              h={46}
              style={{
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 12px 30px rgba(255,138,61,0.22)",
              }}
            />
            <div>
              <Text fw={900} size="lg" c="white" style={{ letterSpacing: 0.3 }}>
                COUNTER-STRIKE LEAGUE
              </Text>
              <Text size="xs" c="rgba(255,255,255,0.60)">
                Scout rosters. Enter tournaments. Dominate the ladder.
              </Text>
            </div>
          </Group>

          <Group gap="sm">
            <TextInput
              placeholder="Search squads, players, tournaments..."
              w={380}
              visibleFrom="md"
              styles={{
                input: {
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.05)",
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
              SERVER: LOCAL
            </Badge>

            <Button
              onClick={onConnectWallet}
              disabled={connecting}
              title={walletErr ?? undefined}
              styles={{
                root: {
                  borderRadius: 16,
                  fontWeight: 900,
                  background:
                    "linear-gradient(135deg, #ff8a3d 0%, #ffb347 100%)",
                  color: "#101418",
                  boxShadow: "0 10px 26px rgba(255,138,61,0.30)",
                },
              }}
            >
              {connecting ? "Connecting…" : walletLabel}
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack justify="space-between" h="100%">
          <div>
            <Group gap="xs" mb="md">
              <BackgroundImage
                src="/images/csgo-hero.jpg"
                radius="xl"
                w={34}
                h={34}
                style={{
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
              <div>
                <Text c="white" fw={900} size="sm">
                  Tactical Arena
                </Text>
                <Text size="xs" c="rgba(255,255,255,0.55)">
                  Competitive on-chain esports
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
                  className="nav-btn"
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
                "linear-gradient(180deg, rgba(255,138,61,0.14), rgba(52,217,255,0.08))",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <Text fw={900} size="md" c="white">
              Major Event Queue
            </Text>
            <Text size="xs" c="rgba(255,255,255,0.65)" mt={6}>
              Track active tournaments, inspect player values, and prepare your
              five-stack for the next Major.
            </Text>

            <Group mt="md" gap="xs">
              <Badge color="orange" variant="light">
                LIVE
              </Badge>
              <Badge color="cyan" variant="light">
                CS2
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
                    "linear-gradient(135deg, #ff8a3d 0%, #ffb347 100%)",
                  color: "#11161b",
                  opacity: 0.72,
                  cursor: "not-allowed",
                },
              }}
            >
              Enter Major (Soon)
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
              "linear-gradient(180deg, rgba(7,11,16,0.86), rgba(5,8,12,0.94))",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.04)",
            padding: 28,
          }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/players" element={<Players />} />
            <Route path="/players/:playerId" element={<PlayerMarket />} />
            <Route path="/contests" element={<Contests />} />
            <Route path="/contests/:contestId" element={<ContestDetail />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}