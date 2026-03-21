import { MemoryRouter } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Players from "./Players";
import { renderWithMantine } from "../test/render";

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    players: vi.fn(),
  },
}));

vi.mock("../services/api", () => ({
  api: apiMock,
}));

describe("Players page", () => {
  it("renders avatar image when avatar_url is available", async () => {
    apiMock.players.mockResolvedValue([
      {
        player_id: 1,
        exists: true,
        total_shares: 100,
        ftk_liquidity: 500,
        share_price_wei: 1_000_000_000_000_000_000,
        avatar_url: "https://cdn.example.com/player-1.png",
      },
    ]);

    renderWithMantine(
      <MemoryRouter>
        <Players />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(apiMock.players).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByAltText("Player 1 avatar")).toBeInTheDocument();
  });
});
