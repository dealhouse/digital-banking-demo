
/**
 * Adapter around RiskClient used by the service layer.
 * Keeps Core API decoupled from transport details (HTTP, JSON shape).
 */


package com.minibank.core.client;

import com.minibank.dto.RiskScoreRequest;
import com.minibank.dto.RiskScoreResponse;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
@Component
public class RiskScoringClient {
    private final RestClient restClient;

    public RiskScoringClient(RestClient riskRestClient) {
        this.restClient = riskRestClient;
    }

    public RiskScoreResponse score(RiskScoreRequest request) {
        return restClient.post()
                .uri("/score")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .onStatus(HttpStatusCode::isError, (req, res) -> {
                    throw new RuntimeException("Risk service error: HTTP " + res.getStatusCode());
                })
                .body(RiskScoreResponse.class);

    }
    

}



