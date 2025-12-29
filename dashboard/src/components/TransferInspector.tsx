// TransferInspector: lightweight dev-tooling UI to inspect a transfer by id and see raw details.

import { useState } from "react";
import type { Account } from "../types";
import { TransferSearchByPrefix } from "./TransferSearchByPrefix";
import { TransferLookup } from "./TransferLookup";

export function TransferInspector({
  token,
  accounts,
  initialId,
}: {
  token: string;
  accounts: Account[];
  initialId?: string;
}) {
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(initialId ?? null);

  return (
    <div className="space-y-4">
      <TransferSearchByPrefix
        token={token}
        accounts={accounts}
        onSelectTransferId={setSelectedTransferId}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="text-sm font-semibold text-slate-900">Transfer details</div>
        <div className="text-sm text-slate-500">
          {selectedTransferId ? "Selected transfer" : "Search or click a transfer to inspect details"}
        </div>

        <div className="mt-3">
          <TransferLookup
            token={token}
            accounts={accounts}
            initialId={selectedTransferId ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}
