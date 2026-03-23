import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import Teams from "./Teams";
import { renderWithMantine } from "../test/render";

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    listTeams: vi.fn(),
    createTeam: vi.fn(),
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

describe("Teams page", () => {
  it("rejects duplicate player ids before submitting", async () => {
    apiMock.listTeams.mockResolvedValue([]);
    apiMock.createTeam.mockResolvedValue({});

    renderWithMantine(<Teams />);

    await waitFor(() => expect(apiMock.listTeams).toHaveBeenCalledTimes(1));

    const playerInputs = screen.getAllByLabelText("Player ID");
    await userEvent.clear(playerInputs[1]);
    await userEvent.type(playerInputs[1], "1");

    await userEvent.click(screen.getByRole("button", { name: "Save team" }));

    expect(await screen.findByText("Player IDs must be unique.")).toBeInTheDocument();
    expect(apiMock.createTeam).not.toHaveBeenCalled();
  });
});
