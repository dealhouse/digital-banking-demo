package com.minibank.core.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Component
public class RiskClient {

  private final RestClient restClient;

  public RiskClient(@Value("${risk.base-url}") String baseUrl) {
    this.restClient = RestClient.builder().baseUrl(baseUrl).build();
  }

  // Matches FastAPI request schema
  public record ScoreRequest(
      String userId,
      String fromAccountId,
      String toAccountId,
      double amount,
      String currency,
      Instant timestamp,
      int last24hTransferCount,
      BigDecimal last24hTransferTotal
  ) {}

  // Matches FastAPI response schema
  public record ScoreResponse(
      int riskScore,
      List<String> reasons
  ) {}

  public ScoreResponse scoreTransfer(
      String userId,
      String fromAccountId,
      String toAccountId,
      BigDecimal amount,
      String currency,
      int last24hCount,
      BigDecimal last24hTotal
  ) {
    ScoreRequest req = new ScoreRequest(
        userId,
        fromAccountId,
        toAccountId,
        amount.doubleValue(),
        currency,
        Instant.now(),
        last24hCount,
        last24hTotal
    );

    return restClient.post()
        .uri("/score")
        .body(req)
        .retrieve()
        .body(ScoreResponse.class);
  }
}

