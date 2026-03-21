import { MemoryRouter, Route, Routes } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ContestDetail from "./ContestDetail";
import { renderWithMantine } from "../test/render";

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    leaderboard: vi.fn(),
    listTeams: vi.fn(),
    contestEntryIntent: vi.fn(),
  },
}));

vi.mock("../services/api", () => ({
  api: apiMock,
}));

vi.mock("../context/WalletContext", () => ({
  useWallet: () => ({
    address: "0x0000000000000000000000000000000000000001",
    connect: vi.fn(),
  }),
}));

const { sendIntentTransactionMock, waitForReceiptMock } = vi.hoisted(() => ({
  sendIntentTransactionMock: vi.fn(),
  waitForReceiptMock: vi.fn(),
}));

vi.mock("../services/tx", () => ({
  sendIntentTransaction: (...args: unknown[]) => sendIntentTransactionMock(...args),
  waitForReceipt: (...args: unknown[]) => waitForReceiptMock(...args),
}));

describe("ContestDetail", () => {
  it("submits team_id entry intent from selected team", async () => {
    apiMock.leaderboard.mockResolvedValue([]);
    apiMock.listTeams.mockResolvedValue([
      {
        team_id: 7,
        owner_wallet: "0x0000000000000000000000000000000000000001",
        name: "Core Five",
        members: [
          { slot_index: 0, player_id: 1, role_label: "AWP" },
          { slot_index: 1, player_id: 2, role_label: "IGL" },
          { slot_index: 2, player_id: 3, role_label: "Entry" },
          { slot_index: 3, player_id: 4, role_label: "Lurker" },
          { slot_index: 4, player_id: 5, role_label: "Support" },
        ],
        created_at: "2026-03-21T00:00:00Z",
        updated_at: "2026-03-21T00:00:00Z",
      },
    ]);
    apiMock.contestEntryIntent.mockResolvedValue({
      contest_id: 1,
      wallet_address: "0x0000000000000000000000000000000000000001",
      entry_fee: 10,
      players: [1, 2, 3, 4, 5],
      resolved_players: [1, 2, 3, 4, 5],
      team_id: 7,
      tx_intent: {
        to: "0xabc",
        data: "0xbeef",
        value_wei: 0,
        chain_id: 11155111,
      },
    });
    sendIntentTransactionMock.mockResolvedValue("0xhash");
    waitForReceiptMock.mockResolvedValue(undefined);

    renderWithMantine(
      <MemoryRouter initialEntries={["/contests/1"]}>
        <Routes>
          <Route path="/contests/:contestId" element={<ContestDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(apiMock.listTeams).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(screen.getByRole("button", { name: "Enter contest" }));

    await waitFor(() => {
      expect(apiMock.contestEntryIntent).toHaveBeenCalledWith(1, {
        wallet_address: "0x0000000000000000000000000000000000000001",
        team_id: 7,
      });
    });
  });
});
