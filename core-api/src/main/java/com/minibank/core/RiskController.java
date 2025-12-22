package com.minibank.core;

import com.minibank.dto.RiskSandboxRequest;
import com.minibank.dto.RiskScoreRequest;

import java.time.Instant;
import java.util.UUID;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.minibank.dto.RiskScoreResponse;

import jakarta.validation.Valid;


// import java.util.Map;
// import org.springframework.web.bind.annotation.GetMapping;

@RestController
@RequestMapping("/api/risk")
public class RiskController {
    
    private final RiskScoringClient riskScoringClient;

    public RiskController(RiskScoringClient riskScoringClient) {
        this.riskScoringClient = riskScoringClient;
    }

    @PostMapping("/score")
    public RiskScoreResponse score(@Valid @RequestBody RiskSandboxRequest request) {

        var riskRequest = new RiskScoreRequest(
            "user-demo",
            UUID.randomUUID().toString(),
            UUID.randomUUID().toString(),
            request.getAmount(),
            request.getCurrency(),
            Instant.now(),
            0,
            0.0
        );

        return riskScoringClient.score(riskRequest);
    }

//     Dev tool
//     @GetMapping("/echo-test")
//     public Map<String, Object> echoTest() {
//     return riskScoringClient.echoSimple(Map.of(
//             "hello", "world",
//             "n", 123,
//             "ok", true
//     ));
// }


}
