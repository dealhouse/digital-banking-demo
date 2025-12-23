package com.minibank.core;

import com.minibank.dto.RiskSandboxRequest;
import com.minibank.dto.RiskScoreRequest;
import com.minibank.dto.RiskScoreResponse;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

import com.minibank.core.domain.RiskAssessmentEntity;
import com.minibank.core.domain.TransferEntity;
import com.minibank.core.repo.RiskAssessmentRepository;
import com.minibank.core.repo.TransferRepository;

@RestController
@RequestMapping("/api/risk")
public class RiskController {

    private final RiskScoringClient riskScoringClient;


    private final RiskAssessmentRepository riskRepo;
    private final TransferRepository transferRepo;

    public RiskController(
            RiskScoringClient riskScoringClient,
            RiskAssessmentRepository riskRepo,
            TransferRepository transferRepo
    ) {
        this.riskScoringClient = riskScoringClient;
        this.riskRepo = riskRepo;
        this.transferRepo = transferRepo;
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


    public record RiskFlagItem(
            String transferId,
            Integer riskScore,
            String riskLevel,
            String reasonsJson,
            String fromAccountId,
            String toAccountId,
            Object amount,
            String currency,
            String status,
            Object createdAt
    ) {}

    @GetMapping("/flags")
    public List<RiskFlagItem> flags(@RequestParam(defaultValue = "70") Integer minScore) {

        List<RiskAssessmentEntity> ras = riskRepo.findByRiskScoreGreaterThanEqual(minScore);
        if (ras.isEmpty()) return List.of();

        // fetch transfers for these assessments
        List<String> transferIds = ras.stream().map(RiskAssessmentEntity::getTransferId).toList();
        Iterable<TransferEntity> transfersIt = transferRepo.findAllById(transferIds);

        Map<String, TransferEntity> transfersById = new HashMap<>();
        for (TransferEntity t : transfersIt) transfersById.put(t.getId(), t);

        // sort by score desc (nice for dashboard)
        ras.sort(Comparator.comparing(RiskAssessmentEntity::getRiskScore).reversed());

        List<RiskFlagItem> out = new ArrayList<>();
        for (RiskAssessmentEntity ra : ras) {
            TransferEntity t = transfersById.get(ra.getTransferId());
            if (t == null) continue;

            out.add(new RiskFlagItem(
                    t.getId(),
                    ra.getRiskScore(),
                    ra.getLevel(),
                    ra.getReasonsJson(),
                    t.getFromAccountId(),
                    t.getToAccountId(),
                    t.getAmount(),
                    t.getCurrency(),
                    t.getStatus(),
                    t.getCreatedAt()
            ));
        }

        return out;
    }
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



