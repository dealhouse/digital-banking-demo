package com.minibank.core;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TransfersIntegrationTest {

  // These match the IDs you used in curl earlier.
  // If you later change seeding, update these accordingly.
  private static final String FROM_ACCOUNT_ID = "89e7a987-07de-4472-b0f7-e966295bf975";
  private static final String TO_ACCOUNT_ID   = "d9b798ad-5bbb-4aa1-8523-b7dddb04aca2";

  private static final JsonMapper JSON = JsonMapper.builder().build();

  private static HttpServer riskStub;
  private static String riskBaseUrl;


  @LocalServerPort
  int port;

  @DynamicPropertySource
static void props(DynamicPropertyRegistry registry) {
  ensureRiskStubStarted();
  registry.add("risk.base-url", () -> riskBaseUrl);

}


  @AfterAll
  static void shutdown() {
    if (riskStub != null) {
      riskStub.stop(0);
      riskStub = null;
    }
  }

  @Test
  void idempotencyKey_returnsSameTransferId() throws Exception {
    String key = UUID.randomUUID().toString();

    String body = """
      {
        "fromAccountId":"%s",
        "toAccountId":"%s",
        "amount": 1,
        "currency":"CAD",
        "memo":"it-idempotency"
      }
      """.formatted(FROM_ACCOUNT_ID, TO_ACCOUNT_ID);

      
      HttpResponse<String> r1 = post("/api/transfers", body, key);
      System.out.println("STATUS=" + r1.statusCode());
      System.out.println("BODY=" + r1.body());
      assertEquals(200, r1.statusCode(), r1.body());


    JsonNode j1 = JSON.readTree(r1.body());
    String transferId1 = j1.path("transferId").asText();
    assertFalse(transferId1.isBlank(), "transferId missing: " + r1.body());

    HttpResponse<String> r2 = post("/api/transfers", body, key);
    assertEquals(200, r2.statusCode(), r2.body());

    JsonNode j2 = JSON.readTree(r2.body());
    String transferId2 = j2.path("transferId").asText();
    assertEquals(transferId1, transferId2, "same idempotency-key should return same transferId");
  }

  @Test
  void rejects_insufficientFunds() throws Exception {
    String key = UUID.randomUUID().toString();

    String body = """
      {
        "fromAccountId":"%s",
        "toAccountId":"%s",
        "amount": 999999999,
        "currency":"CAD",
        "memo":"it-insufficient"
      }
      """.formatted(FROM_ACCOUNT_ID, TO_ACCOUNT_ID);

    HttpResponse<String> r = post("/api/transfers", body, key);
    System.out.println("STATUS=" + r.statusCode());
    System.out.println("BODY=" + r.body());

    assertEquals(400, r.statusCode(), "expected 400, got " + r.statusCode() + " body=" + r.body());
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
      """.formatted(FROM_ACCOUNT_ID, TO_ACCOUNT_ID);

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

        // Fixed response matching your expected ScoreResponse shape
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
