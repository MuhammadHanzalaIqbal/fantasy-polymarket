import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "./api";

describe("api service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts team_id contest entry payload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          contest_id: 5,
          wallet_address: "0x0000000000000000000000000000000000000001",
          entry_fee: 10,
          players: [1, 2, 3, 4, 5],
          resolved_players: [1, 2, 3, 4, 5],
          tx_intent: {
            to: "0xabc",
            data: "0xdead",
            value_wei: 0,
            chain_id: 11155111,
          },
        }),
        { status: 200 }
      )
    );

    await api.contestEntryIntent(5, {
      wallet_address: "0x0000000000000000000000000000000000000001",
      team_id: 9,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    expect(options?.method).toBe("POST");
    expect(options?.body).toContain('"team_id":9');
    expect(options?.body).not.toContain('"players"');
  });
});
