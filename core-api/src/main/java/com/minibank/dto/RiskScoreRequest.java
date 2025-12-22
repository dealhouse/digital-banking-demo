package com.minibank.dto;

import java.time.Instant;

public record RiskScoreRequest(
    String userId,
    String fromAccountId,
    String toAccountId,
    double amount,
    String currency,
    Instant timestamp,
    int last24hTransferCount,
    double last24hTransferTotal
) {}
