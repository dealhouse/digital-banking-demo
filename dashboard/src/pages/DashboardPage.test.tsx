// High-level render test: verifies the dashboard composes key widgets
// without depending on real network calls (mocked api client).

import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, test, expect } from "vitest";
import DashboardPage from "./DashboardPage";
import userEvent from "@testing-library/user-event";
import React from "react";

vi.mock("../components/AccountsLedger", () => ({
  AccountsLedger: () => <div data-testid="accounts-ledger" />,
}));
vi.mock("../components/TransferForm", () => ({
  TransferForm: () => <div data-testid="transfer-form" />,
}));
vi.mock("../components/RiskFlags", () => ({
  RiskFlags: ({ onCountChange }: { onCountChange?: (n: number) => void; onMinScoreChange: (n: number) => void }) => {
    React.useEffect(() => { onCountChange?.(3); }, [onCountChange]);
    return <div data-testid="risk-flags" />;
  },
}));
vi.mock("../components/TransferLookup", () => ({
  TransferLookup: () => <div data-testid="transfer-lookup" />,
}));
vi.mock("../components/TransferSearchByPrefix", () => ({
  TransferSearchByPrefix: () => <div data-testid="transfer-search" />,
}));

describe("DashboardPage", () => {
  test("risk badge shows count after RiskFlags reports it", async () => {
    const user = userEvent.setup();

    render(
      <DashboardPage
        session={{ token: "demo-token", email: "demo@digitalbanking.dev" }}
        onLogout={() => { }}
      />
    );
    await user.click(screen.getByRole("button", { name: /risk & compliance/i }));

    await waitFor(() => {
      expect(screen.getByTitle(/Number of flagged transfers/i)).toHaveTextContent("3");
    });

  });
});
