package com.minibank.core.client;

import com.minibank.dto.RiskScoreRequest;
import com.minibank.dto.RiskScoreResponse;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
// import java.util.Map;
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
    // Dev tool
    // public Map echoSimple(Map<String, Object> payload) {
    //     return restClient.post()
    //             .uri("/echo") // base-url includes /risk
    //             .contentType(MediaType.APPLICATION_JSON)
    //             .body(payload)
    //             .retrieve()
    //             .body(Map.class);
    // }
}



// ...

