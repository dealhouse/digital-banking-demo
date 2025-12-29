/**
 * Integration test: creates a transfer and verifies persisted effects
 * (transfer row + ledger entries + risk assessment saved / returned).
 */

package com.minibank.core;

import com.minibank.core.domain.AccountEntity;
import com.minibank.core.repo.AccountRepository;
import com.minibank.core.repo.UserRepository;
import com.minibank.core.repo.TransferRepository;
import com.minibank.core.repo.LedgerEntryRepository;
import com.minibank.core.repo.RiskAssessmentRepository;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
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
@ActiveProfiles("test")
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

  @Autowired
  UserRepository users;
  @Autowired
  AccountRepository accounts;
  @Autowired
  TransferRepository transfers;
  @Autowired
  LedgerEntryRepository ledger;
  @Autowired
  RiskAssessmentRepository risks;

  private String fromAccountId;
  private String toAccountId;
  private BigDecimal fromBalance;

  @DynamicPropertySource
  static void props(DynamicPropertyRegistry registry) {
    ensureRiskStubStarted();
    registry.add("risk.base-url", () -> riskBaseUrl);

    // ✅ portable: isolated sqlite per test run
    registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DB_FILE.toAbsolutePath());
    registry.add("spring.jpa.hibernate.ddl-auto=create-drop", () -> null);
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
    String userId = users.findByEmail("demo@digitalbanking.dev").orElseThrow().getId();

    // keep accounts/users, but clear “activity”
    risks.deleteAll();
    ledger.deleteAll();
    transfers.deleteAll();

    List<AccountEntity> list = accounts.findAllByUserId(userId);
    if (list.size() < 2) {
      throw new IllegalStateException("Not enough accounts to pick from");
    }
    AccountEntity a = list.get(0);
    AccountEntity b = list.get(1);
    fromAccountId = a.getId();
    toAccountId = b.getId();

    // reset balances so insufficient-funds test is deterministic
    a.setBalance(new BigDecimal("2500.00"));
    b.setBalance(new BigDecimal("5000.00"));
    accounts.saveAll(List.of(a, b));

    fromBalance = a.getBalance();
    assertNotNull(fromAccountId);
    assertNotNull(toAccountId);
    assertNotNull(fromBalance);
  }

  @Test
  void idempotencyKey_returnsSameTransferId_andDoesNotDuplicateLedger() throws Exception {
    String key = UUID.randomUUID().toString();
    BigDecimal amount = BigDecimal.ONE;

    String body = """
          {"fromAccountId":"%s","toAccountId":"%s","amount":%s,"currency":"CAD","memo":"it-idempotency"}
        """.formatted(fromAccountId, toAccountId, amount);

    HttpResponse<String> r1 = post("/api/transfers", body, key);
    assertEquals(200, r1.statusCode(), r1.body());
    String transferId1 = JSON.readTree(r1.body()).path("transferId").asString();

    HttpResponse<String> r2 = post("/api/transfers", body, key);
    assertEquals(200, r2.statusCode(), r2.body());
    String transferId2 = JSON.readTree(r2.body()).path("transferId").asString();

    assertEquals(transferId1, transferId2);

    // ✅ prove “exactly one transfer row”
    assertEquals(1, transfers.count(), "idempotent request should not create multiple transfers");

    // ✅ prove “exactly two ledger entries (debit + credit)”
    // If your ledger stores transferId, add a repo method findByTransferId(...)
    // Otherwise, assert total count == 2 for this isolated test.
    assertEquals(2, ledger.count(), "idempotent request should not duplicate ledger entries");
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
    if (riskStub != null)
      return;

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

  @Test
  void transfer_success_updatesBalances_andCreatesLedgerEntries() throws Exception {
    String key = UUID.randomUUID().toString();
    BigDecimal amount = new BigDecimal("10.00");

    BigDecimal fromBefore = accounts.findById(fromAccountId).orElseThrow().getBalance();
    BigDecimal toBefore = accounts.findById(toAccountId).orElseThrow().getBalance();

    String body = """
          {"fromAccountId":"%s","toAccountId":"%s","amount":%s,"currency":"CAD","memo":"it-balances"}
        """.formatted(fromAccountId, toAccountId, amount);

    HttpResponse<String> r = post("/api/transfers", body, key);
    assertEquals(200, r.statusCode(), r.body());

    // balances moved
    BigDecimal fromAfter = accounts.findById(fromAccountId).orElseThrow().getBalance();
    BigDecimal toAfter = accounts.findById(toAccountId).orElseThrow().getBalance();

    assertEquals(0, fromBefore.subtract(amount).compareTo(fromAfter), "from account should be debited");
    assertEquals(0, toBefore.add(amount).compareTo(toAfter), "to account should be credited");

    // ledger created (2 entries)
    assertEquals(2, ledger.count(), "should create debit + credit ledger entries");
  }

  @Test
  void transfer_returnsRiskAssessment_fields() throws Exception {
    String key = UUID.randomUUID().toString();

    String body = """
          {"fromAccountId":"%s","toAccountId":"%s","amount":1,"currency":"CAD","memo":"it-risk"}
        """.formatted(fromAccountId, toAccountId);

    HttpResponse<String> r = post("/api/transfers", body, key);
    assertEquals(200, r.statusCode(), r.body());

    JsonNode json = JSON.readTree(r.body());
    assertTrue(json.hasNonNull("riskScore"));
    assertTrue(json.hasNonNull("riskLevel"));
    assertTrue(json.has("riskReasons"));
    assertTrue(json.get("riskReasons").isArray());
    assertTrue(json.get("riskReasons").size() >= 0);

    // also prove it was persisted
    assertEquals(1, risks.count(), "risk assessment should be stored");
  }

  @Test
  void transfers_pagination_returnsNewestFirst_andPageSize() throws Exception {
    // seed 30 transfers
    for (int i = 0; i < 30; i++) {
      String key = "page-" + i + "-" + UUID.randomUUID();
      String body = """
            {"fromAccountId":"%s","toAccountId":"%s","amount":1,"currency":"CAD","memo":"it-page-%s"}
          """.formatted(fromAccountId, toAccountId, i);
      HttpResponse<String> r = post("/api/transfers", body, key);
      assertEquals(200, r.statusCode());
    }

    HttpResponse<String> page0 = get("/api/transfers?page=0&size=25");
    assertEquals(200, page0.statusCode(), page0.body());

    JsonNode root = JSON.readTree(page0.body());
    JsonNode content = root.get("content");
    assertEquals(25, content.size(), "page 0 should have 25 rows");

    // newest-first check: createdAt should be descending
    String first = content.get(0).get("createdAt").asString();
    String second = content.get(1).get("createdAt").asString();
    assertTrue(first.compareTo(second) >= 0, "expected createdAt desc ordering");

    assertEquals(30, root.get("totalElements").asInt());
  }

  private HttpResponse<String> get(String path) throws Exception {
    HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    URI uri = URI.create("http://localhost:" + port + path);
    HttpRequest req = HttpRequest.newBuilder(uri)
        .timeout(Duration.ofSeconds(10))
        .header("Authorization", "Bearer demo-token")
        .GET()
        .build();
    return client.send(req, HttpResponse.BodyHandlers.ofString());
  }

}
