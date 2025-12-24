package com.minibank.core;

import com.minibank.core.domain.AccountEntity;
import com.minibank.core.repo.AccountRepository;
import com.minibank.core.repo.UserRepository;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TransfersIntegrationTest {

  private static final JsonMapper JSON = JsonMapper.builder().build();

  private static HttpServer riskStub;
  private static String riskBaseUrl;

  private static final Path DB_FILE;
  static {
    try {
      Path dir = Files.createTempDirectory("core-api-it-");
      DB_FILE = dir.resolve("test.db");
    } catch (IOException e) {
      throw new ExceptionInInitializerError(e);
    }
  }

  @LocalServerPort
  int port;

  @Autowired UserRepository users;
  @Autowired AccountRepository accounts;

  private String fromAccountId;
  private String toAccountId;
  private BigDecimal fromBalance;

  @DynamicPropertySource
  static void props(DynamicPropertyRegistry registry) {
    ensureRiskStubStarted();
    registry.add("risk.base-url", () -> riskBaseUrl);

    // ✅ portable: isolated sqlite per test run
    registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DB_FILE.toAbsolutePath());
    registry.add("spring.jpa.hibernate.ddl-auto", () -> "update");
  }

  @AfterAll
  static void shutdown() {
    if (riskStub != null) {
      riskStub.stop(0);
      riskStub = null;
    }
  }

  @BeforeEach
  void pickTwoAccounts() {
    // This assumes your app seeds a demo user + accounts on startup.
    // If this throws, it means seeding isn't running in tests.
    users.findByEmail("demo@digitalbanking.dev")
        .orElseThrow(() -> new IllegalStateException(
            "Demo user not found in test DB. Ensure your seeder runs for tests."));

    List<AccountEntity> list = accounts.findAll();
    if (list.size() < 2) {
      throw new IllegalStateException("Need at least 2 seeded accounts in test DB.");
    }

    AccountEntity a = list.get(0);
    AccountEntity b = list.get(1);

    fromAccountId = a.getId();
    toAccountId = b.getId();
    fromBalance = a.getBalance();
    assertNotNull(fromAccountId);
    assertNotNull(toAccountId);
    assertNotNull(fromBalance);
  }

  @Test
  void idempotencyKey_returnsSameTransferId() throws Exception {
    String key = UUID.randomUUID().toString();

    BigDecimal amount = BigDecimal.ONE; // 1
    String body = """
      {
        "fromAccountId":"%s",
        "toAccountId":"%s",
        "amount": %s,
        "currency":"CAD",
        "memo":"it-idempotency"
      }
      """.formatted(fromAccountId, toAccountId, amount);

    HttpResponse<String> r1 = post("/api/transfers", body, key);
    assertEquals(200, r1.statusCode(), r1.body());

    String transferId1 = JSON.readTree(r1.body()).path("transferId").asString();
    assertFalse(transferId1.isBlank(), "transferId missing: " + r1.body());

    HttpResponse<String> r2 = post("/api/transfers", body, key);
    assertEquals(200, r2.statusCode(), r2.body());

    String transferId2 = JSON.readTree(r2.body()).path("transferId").asString();
    assertEquals(transferId1, transferId2, "same idempotency-key should return same transferId");
  }

  @Test
  void rejects_insufficientFunds() throws Exception {
    String key = UUID.randomUUID().toString();

    BigDecimal tooMuch = fromBalance.add(BigDecimal.valueOf(100));
    String body = """
      {
        "fromAccountId":"%s",
        "toAccountId":"%s",
        "amount": %s,
        "currency":"CAD",
        "memo":"it-insufficient"
      }
      """.formatted(fromAccountId, toAccountId, tooMuch);

    HttpResponse<String> r = post("/api/transfers", body, key);
    assertEquals(400, r.statusCode(), "expected 400, got " + r.statusCode() + " body=" + r.body());

    JsonNode err = JSON.readTree(r.body());
    assertTrue(err.has("error"), "expected error body, got: " + r.body());
  }

  @Test
  void rejects_missingIdempotencyKey() throws Exception {
    String body = """
      {
        "fromAccountId":"%s",
        "toAccountId":"%s",
        "amount": 1,
        "currency":"CAD",
        "memo":"it-missing-idem"
      }
      """.formatted(fromAccountId, toAccountId);

    HttpResponse<String> r = postWithoutIdempotency("/api/transfers", body);
    assertEquals(400, r.statusCode(), "expected 400, got " + r.statusCode() + " body=" + r.body());
  }

  private HttpResponse<String> post(String path, String json, String idempotencyKey) throws Exception {
    HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(3))
        .build();

    URI uri = URI.create("http://localhost:" + port + path);

    HttpRequest req = HttpRequest.newBuilder(uri)
        .timeout(Duration.ofSeconds(10))
        .header("Content-Type", "application/json")
        .header("Authorization", "Bearer demo-token")
        .header("Idempotency-Key", idempotencyKey)
        .POST(HttpRequest.BodyPublishers.ofString(json))
        .build();

    return client.send(req, HttpResponse.BodyHandlers.ofString());
  }

  private HttpResponse<String> postWithoutIdempotency(String path, String json) throws Exception {
    HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(3))
        .build();

    URI uri = URI.create("http://localhost:" + port + path);

    HttpRequest req = HttpRequest.newBuilder(uri)
        .timeout(Duration.ofSeconds(10))
        .header("Content-Type", "application/json")
        .header("Authorization", "Bearer demo-token")
        .POST(HttpRequest.BodyPublishers.ofString(json))
        .build();

    return client.send(req, HttpResponse.BodyHandlers.ofString());
  }

  private static synchronized void ensureRiskStubStarted() {
    if (riskStub != null) return;

    try {
      riskStub = HttpServer.create(new InetSocketAddress("localhost", 0), 0);

      riskStub.createContext("/score", (HttpExchange exchange) -> {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
          exchange.sendResponseHeaders(405, -1);
          exchange.close();
          return;
        }

        String responseJson = """
          { "score": 12, "level": "LOW", "reasons": ["stubbed-risk-service"] }
          """;

        byte[] bytes = responseJson.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
          os.write(bytes);
        }
        exchange.close();
      });

      riskStub.start();
      int p = riskStub.getAddress().getPort();
      riskBaseUrl = "http://localhost:" + p;

    } catch (IOException e) {
      throw new RuntimeException("Failed to start risk stub server", e);
    }
  }
}
