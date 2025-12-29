/**
 * Computes transfer activity windows used by risk scoring:
 * - velocity: number of transfers in the last 24 hours
 * - total: sum of transfer amounts in the last 24 hours
 *
 * Notes:
 * - Use Instant/UTC for window boundaries to avoid timezone surprises.
 * - Keep queries indexed / bounded (prefer DB aggregation over in-memory loops).
 */

package com.minibank.core.service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.minibank.core.repo.TransferRepository;

@Service
public class StatsService {
  private final TransferRepository transferRepo;

  public StatsService(TransferRepository transferRepo) {
    this.transferRepo = transferRepo;
  }

  public TransferWindowStatsDto last24h(String userId, String currency) {
    Instant since = Instant.now().minus(Duration.ofHours(24));

    var stats = transferRepo.windowStats(userId, since, "APPROVED", currency);

    int count = stats.getTransferCount();
    BigDecimal sum = Optional.ofNullable(stats.getTransferTotal()).orElse(BigDecimal.ZERO);

    return new TransferWindowStatsDto(count, sum, since, currency);
  }

  public record TransferWindowStatsDto(int count, BigDecimal sum, Instant since, String currency) {
  }
}
