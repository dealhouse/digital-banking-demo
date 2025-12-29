import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, expect, test } from "vitest";
import { TransferForm } from "./TransferForm";

vi.mock("../api", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../api")>();
  return {
    ...mod,
    createTransfer: vi.fn(),
    newIdempotencyKey: () => "idem-test-1", // optional
  };
});

import { createTransfer } from "../api";

test("shows risk info after successful transfer", async () => {
  vi.mocked(createTransfer).mockResolvedValueOnce({
    transferId: "t_123",
    status: "COMPLETED",
    amount: 10,
    currency: "CAD",
    riskScore: 30,
    riskLevel: "HIGH",
    riskReasons: ["large_amount"],
  });

  const accounts = [
    { id: "a1", userId: "u", name: "Chequing", type: "CHECKING", currency: "CAD", balance: 1000, createdAt: "" },
    { id: "a2", userId: "u", name: "Savings", type: "SAVINGS", currency: "CAD", balance: 500, createdAt: "" },
  ];

  render(<TransferForm token="demo-token" accounts={accounts} onTransferSuccess={() => {}} />);

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /send transfer/i }));

  expect(await screen.findByText(/transfer created/i)).toBeInTheDocument();

  expect(screen.getByText(/large_amount/i)).toBeInTheDocument();
});
