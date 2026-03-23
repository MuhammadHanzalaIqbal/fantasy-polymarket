import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import Admin from "./Admin";
import { renderWithMantine } from "../test/render";

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    adminCreatePlayer: vi.fn(),
  },
}));

vi.mock("../services/api", () => ({
  api: {
    adminCreatePlayer: (...args: unknown[]) => apiMock.adminCreatePlayer(...args),
    adminCreateContest: vi.fn(),
    adminResolveContest: vi.fn(),
  },
}));

describe("Admin page", () => {
  it("sends avatar_url in create player payload", async () => {
    apiMock.adminCreatePlayer.mockResolvedValue({
      player_id: 1,
      token_already_exists: false,
      player_already_listed: false,
      create_token_tx: null,
      add_market_tx: null,
    });

    renderWithMantine(<Admin />);

    await userEvent.type(
      screen.getByPlaceholderText("X-API-Key (e.g. demo-key)"),
      "demo-key"
    );
    await userEvent.clear(screen.getByLabelText("Player ID (e.g. 5 for player 5)"));
    await userEvent.type(screen.getByLabelText("Player ID (e.g. 5 for player 5)"), "7");
    await userEvent.type(screen.getByPlaceholderText("e.g. Player 1"), "Player Seven");
    await userEvent.type(screen.getByPlaceholderText("e.g. P1"), "P7");
    await userEvent.type(
      screen.getByPlaceholderText("https://cdn.example.com/player-1.png"),
      "https://cdn.example.com/player-7.png"
    );

    await userEvent.click(screen.getByRole("button", { name: "Create player" }));

    await waitFor(() => {
      expect(apiMock.adminCreatePlayer).toHaveBeenCalled();
    });

    const [payload] = apiMock.adminCreatePlayer.mock.calls[0];
    expect(payload).toMatchObject({
      token_name: "Player Seven",
      token_symbol: "P7",
      avatar_url: "https://cdn.example.com/player-7.png",
    });
  });
});
