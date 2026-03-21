import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

import { useWallet } from "../context/WalletContext";
import { api, type TeamCreateMember, type TeamResponse } from "../services/api";
import { formatPlayerId } from "../utils/format";

const panel: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const innerPanel: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
};

type MemberDraft = {
  slot_index: number;
  player_id: number;
  role_label: string;
  nickname: string;
};

function initialMembers(): MemberDraft[] {
  return Array.from({ length: 5 }, (_, idx) => ({
    slot_index: idx,
    player_id: idx + 1,
    role_label: "",
    nickname: "",
  }));
}

function buildMembersPayload(members: MemberDraft[]): TeamCreateMember[] {
  return members.map((member) => ({
    slot_index: member.slot_index,
    player_id: member.player_id,
    role_label: member.role_label.trim(),
    player_info: member.nickname.trim()
      ? { nickname: member.nickname.trim() }
      : undefined,
  }));
}

export default function Teams() {
  const { address, connect } = useWallet();
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamName, setTeamName] = useState("Core Five");
  const [members, setMembers] = useState<MemberDraft[]>(initialMembers());
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.team_id === selectedTeamId) ?? null,
    [selectedTeamId, teams]
  );

  const loadTeams = useCallback(async (walletAddress: string): Promise<void> => {
    setLoadingTeams(true);
    setErr(null);
    try {
      const response = await api.listTeams(walletAddress);
      setTeams(response);
      if (response.length > 0) {
        setSelectedTeamId((previous) =>
          previous !== null && response.some((team) => team.team_id === previous)
            ? previous
            : response[0].team_id
        );
      } else {
        setSelectedTeamId(null);
      }
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  useEffect(() => {
    if (!address) {
      setTeams([]);
      setSelectedTeamId(null);
      return;
    }
    loadTeams(address);
  }, [address, loadTeams]);

  function updateMember(
    slotIndex: number,
    key: "player_id" | "role_label" | "nickname",
    value: number | string
  ): void {
    setMembers((prev) =>
      prev.map((member) =>
        member.slot_index === slotIndex ? { ...member, [key]: value } : member
      )
    );
  }

  function validateDraft(): string | null {
    if (!teamName.trim()) {
      return "Team name is required.";
    }
    if (members.length !== 5) {
      return "Team must contain exactly 5 players.";
    }
    const sortedSlots = [...members].map((m) => m.slot_index).sort();
    if (JSON.stringify(sortedSlots) !== JSON.stringify([0, 1, 2, 3, 4])) {
      return "Slots must include each index from 0 to 4 exactly once.";
    }
    const duplicatePlayers = members.some(
      (member, idx) =>
        members.findIndex((candidate) => candidate.player_id === member.player_id) !==
        idx
    );
    if (duplicatePlayers) {
      return "Player IDs must be unique.";
    }
    if (members.some((member) => member.player_id <= 0)) {
      return "Each player ID must be a positive integer.";
    }
    if (members.some((member) => !member.role_label.trim())) {
      return "Each slot must include a role label.";
    }
    return null;
  }

  async function createTeam(): Promise<void> {
    setErr(null);
    setMsg(null);

    let wallet = address;
    if (!wallet) {
      await connect();
      wallet =
        (
          window as unknown as {
            ethereum?: { selectedAddress?: string };
          }
        ).ethereum?.selectedAddress ?? null;
    }
    if (!wallet) {
      setErr("Connect wallet first.");
      return;
    }

    const validationError = validateDraft();
    if (validationError) {
      setErr(validationError);
      return;
    }

    setSavingTeam(true);
    try {
      const created = await api.createTeam({
        wallet_address: wallet,
        name: teamName.trim(),
        members: buildMembersPayload(members),
      });
      setMsg(`Team created: #${created.team_id}`);
      setTeamName("Core Five");
      setMembers(initialMembers());
      await loadTeams(wallet);
      setSelectedTeamId(created.team_id);
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingTeam(false);
    }
  }

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
                TEAM BUILDER
              </Badge>
              <Badge color="blue" variant="light" radius="xl">
                5 SLOTS
              </Badge>
              <Badge color="yellow" variant="light" radius="xl">
                PHASE 1
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
              Build your roster
              <br />
              before contest entry.
            </Text>
            <Text mt="md" size="md" c="rgba(255,255,255,0.66)" maw={700}>
              Create and store fixed five-player teams with role labels. Use these
              saved teams for contest entry.
            </Text>
          </div>
        </Group>
      </Paper>

      {!address && (
        <Card radius={24} p="xl" style={panel}>
          <Stack gap="md">
            <Text c="white" fw={900} size="lg">
              Wallet required
            </Text>
            <Text c="rgba(255,255,255,0.65)">
              Connect your wallet to create and view your teams.
            </Text>
            <Button
              onClick={connect}
              radius="xl"
              styles={{
                root: {
                  fontWeight: 900,
                  background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
                  color: "white",
                  maxWidth: 220,
                },
              }}
            >
              Connect wallet
            </Button>
          </Stack>
        </Card>
      )}

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="lg">
        <Card radius={24} p="xl" style={panel}>
          <Stack gap="md">
            <Text c="white" fw={950} size="xl">
              Create team
            </Text>
            <TextInput
              label="Team name"
              value={teamName}
              onChange={(event) => setTeamName(event.currentTarget.value)}
              placeholder="Core Five"
              styles={darkInputStyles}
            />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              {members.map((member) => (
                <Paper key={member.slot_index} radius={16} p="sm" style={innerPanel}>
                  <Stack gap="xs">
                    <Text c="white" fw={800} size="sm">
                      Slot {member.slot_index + 1}
                    </Text>
                    <NumberInput
                      label="Player ID"
                      value={member.player_id}
                      min={1}
                      onChange={(value) =>
                        updateMember(member.slot_index, "player_id", Number(value) || 0)
                      }
                      styles={darkInputStyles}
                    />
                    <TextInput
                      label="Role"
                      value={member.role_label}
                      onChange={(event) =>
                        updateMember(
                          member.slot_index,
                          "role_label",
                          event.currentTarget.value
                        )
                      }
                      placeholder="AWP / IGL / Entry / Support"
                      styles={darkInputStyles}
                    />
                    <TextInput
                      label="Nickname (optional)"
                      value={member.nickname}
                      onChange={(event) =>
                        updateMember(
                          member.slot_index,
                          "nickname",
                          event.currentTarget.value
                        )
                      }
                      placeholder="player tag"
                      styles={darkInputStyles}
                    />
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>

            <Button
              onClick={createTeam}
              loading={savingTeam}
              disabled={!address || savingTeam}
              radius="xl"
              styles={{
                root: {
                  fontWeight: 900,
                  background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
                  color: "white",
                },
              }}
            >
              Save team
            </Button>
          </Stack>
        </Card>

        <Card radius={24} p="xl" style={panel}>
          <Stack gap="md">
            <Group justify="space-between">
              <Text c="white" fw={950} size="xl">
                My teams
              </Text>
              <Button
                size="xs"
                variant="light"
                onClick={() => address && loadTeams(address)}
                loading={loadingTeams}
                disabled={!address}
              >
                Refresh
              </Button>
            </Group>

            {loadingTeams ? (
              <Text c="rgba(255,255,255,0.65)">Loading teams...</Text>
            ) : teams.length === 0 ? (
              <Text c="rgba(255,255,255,0.65)">
                No teams yet. Create your first roster on the left.
              </Text>
            ) : (
              <Stack gap="xs">
                {teams.map((team) => (
                  <Button
                    key={team.team_id}
                    variant={team.team_id === selectedTeamId ? "filled" : "light"}
                    onClick={() => setSelectedTeamId(team.team_id)}
                    styles={{
                      root: {
                        justifyContent: "space-between",
                        fontWeight: 800,
                        color: "white",
                        background:
                          team.team_id === selectedTeamId
                            ? "linear-gradient(135deg, #2563EB 0%, #16A34A 100%)"
                            : "rgba(255,255,255,0.06)",
                      },
                    }}
                  >
                    #{team.team_id} - {team.name}
                  </Button>
                ))}
              </Stack>
            )}

            {selectedTeam && (
              <Paper radius={16} p="md" style={innerPanel}>
                <Stack gap="xs">
                  <Text c="white" fw={900}>
                    Team #{selectedTeam.team_id}: {selectedTeam.name}
                  </Text>
                  {selectedTeam.members
                    .sort((a, b) => a.slot_index - b.slot_index)
                    .map((member) => (
                      <Group key={`${selectedTeam.team_id}-${member.slot_index}`} gap="xs">
                        <Badge radius="xl" color="blue" variant="light">
                          Slot {member.slot_index + 1}
                        </Badge>
                        <Text c="white" fw={700}>
                          Player {formatPlayerId(member.player_id)}
                        </Text>
                        <Text c="rgba(255,255,255,0.6)">{member.role_label}</Text>
                      </Group>
                    ))}
                </Stack>
              </Paper>
            )}
          </Stack>
        </Card>
      </SimpleGrid>

      {msg && (
        <Alert
          color="green"
          radius={16}
          style={{ background: "rgba(34,197,94,0.15)" }}
        >
          {msg}
        </Alert>
      )}
      {err && (
        <Alert
          color="red"
          radius={16}
          style={{ background: "rgba(239,68,68,0.15)" }}
        >
          {err}
        </Alert>
      )}
    </Stack>
  );
}

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
