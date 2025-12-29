// These assertions intentionally depend on stable reason codes
// (breaking changes should be caught here).

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, test, expect, beforeEach } from "vitest";

vi.mock("../api", () => ({ api: vi.fn() }));
import { api } from "../api";
import { AccountsLedger } from "./AccountsLedger";

const apiMock = vi.mocked(api);

describe("AccountsLedger", () => {
  beforeEach(() => vi.resetAllMocks());

  test("loads accounts, loads ledger for selected account, and emits transferId on click", async () => {
    apiMock
      .mockResolvedValueOnce([
        { id: "acc-1", userId: "u", name: "Checking", type: "CHECKING", balance: 1000, currency: "CAD", createdAt: "2024-12-31T00:00:00Z" },
        { id: "acc-2", userId: "u", name: "Savings", type: "SAVINGS", balance: 5000, currency: "CAD", createdAt: "2024-12-31T00:00:00Z" },
      ])
      .mockResolvedValueOnce([
        {
          id: "le-1",
          accountId: "acc-1",
          transferId: "tr-11111111-aaaa-bbbb-cccc-000000000001",
          type: "DEBIT",
          amount: 10,
          balance: 990,
          createdAt: "2024-12-31T00:00:00Z",
        },
      ]);

    const onTransferSelect = vi.fn();
    render(<AccountsLedger refreshToken={0} onTransferSelect={onTransferSelect} />);

    // accounts fetch + first account auto-selected
    await screen.findByText("Checking");

    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith("/accounts");
      expect(apiMock).toHaveBeenCalledWith("/accounts/acc-1/ledger");
    });

    // click transfer by title (full id)
    const btn = await screen.findByTitle("tr-11111111-aaaa-bbbb-cccc-000000000001");
    await userEvent.click(btn);

    expect(onTransferSelect).toHaveBeenCalledWith("tr-11111111-aaaa-bbbb-cccc-000000000001");
  });
});
