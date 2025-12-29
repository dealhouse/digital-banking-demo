// These assertions intentionally depend on stable reason codes
// (breaking changes should be caught here).

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, test, expect, beforeEach } from "vitest";
import { RiskFlags } from "./RiskFlags";
import type { Account } from "../types";
import { useState } from "react";


vi.mock("../api", () => ({
  api: vi.fn(),
}));

import { api } from "../api";

const apiMock = vi.mocked(api);


describe("RiskFlags", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });


  const ACCOUNTS: Account[] = [
    { id: "acc-1", userId: "user-1", name: "Checking", type: "CHECKING", balance: 1000, currency: "CAD", createdAt: "2024-12-31T00:00:00Z" },
    { id: "acc-2", userId: "user-1", name: "Savings", type: "SAVINGS", balance: 5000, currency: "CAD", createdAt: "2024-12-31T00:00:00Z" },
  ];

  function Harness({
    onCountChange,
    onMinScoreChangeSpy,
  }: {
    onCountChange: (n: number) => void;
    onMinScoreChangeSpy: (n: number) => void;
  }) {
    const [minScore, setMinScore] = useState(20);

    return (
      <RiskFlags
        refreshToken={0}
        accounts={ACCOUNTS}
        minScore={minScore}
        onCountChange={onCountChange}
        onMinScoreChange={(n) => {
          onMinScoreChangeSpy(n);
          setMinScore(n);
        }}
      />
    );
  }

  test("loads flags and calls onCountChange", async () => {
    apiMock.mockResolvedValueOnce([
      {
        transferId: "tr-1", amount: 600, currency: "CAD", status: "APPROVED", createdAt: "2024-12-31T00:00:00Z",
        fromAccountId: "acc-1", toAccountId: "acc-2", riskScore: 30, riskLevel: "HIGH", riskReasons: ["large_amount"]
      },
    ]);

    const onCountChange = vi.fn();
    const onMinScoreChangeSpy = vi.fn();

    render(<Harness onCountChange={onCountChange} onMinScoreChangeSpy={onMinScoreChangeSpy} />);

    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    expect(apiMock).toHaveBeenCalledWith("/risk/flags?minScore=20");

    await waitFor(() => expect(onCountChange).toHaveBeenCalledWith(1));
  });

  test("changing minScore reloads and updates count", async () => {
    apiMock.mockImplementation(async (path: string) => {
      const url = new URL(path, "http://local");
      const min = Number(url.searchParams.get("minScore"));

      // return 2 items once threshold reaches 40+
      if (!Number.isFinite(min) || min < 40) {
        return [
          {
            transferId: "tr-1",
            amount: 600,
            currency: "CAD",
            status: "APPROVED",
            createdAt: "2024-12-31T00:00:00Z",
            fromAccountId: "acc-1",
            toAccountId: "acc-2",
            riskScore: 30,
            riskLevel: "HIGH",
            riskReasons: ["large_amount"],
          },
        ];
      }

      return [
        {
          transferId: "tr-1",
          amount: 600,
          currency: "CAD",
          status: "APPROVED",
          createdAt: "2024-12-31T00:00:00Z",
          fromAccountId: "acc-1",
          toAccountId: "acc-2",
          riskScore: 30,
          riskLevel: "HIGH",
          riskReasons: ["large_amount"],
        },
        {
          transferId: "tr-2",
          amount: 700,
          currency: "CAD",
          status: "APPROVED",
          createdAt: "2024-12-31T00:00:00Z",
          fromAccountId: "acc-1",
          toAccountId: "acc-2",
          riskScore: 80,
          riskLevel: "HIGH",
          riskReasons: ["large_amount"],
        },
      ];
    });

    const user = userEvent.setup();
    const onCountChange = vi.fn();
    const onMinScoreChangeSpy = vi.fn();

    render(<Harness onCountChange={onCountChange} onMinScoreChangeSpy={onMinScoreChangeSpy} />);

    // initial load
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith("/risk/flags?minScore=20"));

    const input = screen.getByRole("spinbutton", { name: /minScore/i });
    await user.clear(input);
    await user.type(input, "40");
    await user.tab(); // helpful if your component fetches on blur

    await waitFor(() => expect(onMinScoreChangeSpy).toHaveBeenCalledWith(40));
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith("/risk/flags?minScore=40"));
    await waitFor(() => expect(onCountChange).toHaveBeenLastCalledWith(2));
  });



  test("shows empty state when no flags", async () => {
    apiMock.mockResolvedValue([]);

    const onCountChange = vi.fn();
    const onMinScoreChange = vi.fn();
    render(<RiskFlags refreshToken={0} accounts={[]} onCountChange={onCountChange} onMinScoreChange={onMinScoreChange} />);

    await screen.findByText(/No flagged transfers/i);
  });

  test("shows error when api throws", async () => {
    apiMock.mockRejectedValue(new Error("boom"));

    const onCountChange = vi.fn();
    const onMinScoreChange = vi.fn();
    render(<RiskFlags refreshToken={0} accounts={[]} onCountChange={onCountChange} onMinScoreChange={onMinScoreChange} />);

    await screen.findByText(/boom/i);
  });
});
