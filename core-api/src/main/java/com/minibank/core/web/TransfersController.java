package com.minibank.core.web;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.minibank.core.domain.RiskAssessmentEntity;
import com.minibank.core.domain.TransferEntity;
import com.minibank.core.repo.RiskAssessmentRepository;
import com.minibank.core.repo.UserRepository;
import com.minibank.core.service.StatsService;
import com.minibank.core.service.TransferService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.server.ResponseStatusException;


import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@RestController
@RequestMapping("/api")
public class TransfersController {
    
    private final TransferService transferService;
    private final com.minibank.core.repo.TransferRepository transferRepo;
    private final RiskAssessmentRepository riskRepo;
    private final UserRepository users;
    private final StatsService statsService;

    
    public TransfersController(TransferService transferService,
                            com.minibank.core.repo.TransferRepository transferRepo,
                            RiskAssessmentRepository riskRepo,
                            UserRepository users,
                            StatsService statsService) {
        this.transferService = transferService;
        this.transferRepo = transferRepo;
        this.riskRepo = riskRepo;
        this.users = users;
        this.statsService = statsService;
    }
    
    private String demoUserId() {
        return users.findByEmail("demo@digitalbanking.dev").orElseThrow().getId();
    }
    
    public record CreateTransferRequest(
        @NotNull String fromAccountId,
        @NotNull String toAccountId,
        @NotNull@Positive BigDecimal amount,
        @NotBlank String currency,
        String memo
    ) {}
    
    public record CreateTransferResponse(
        String transferId,
        String status,
        BigDecimal amount,
        String currency,
        Integer riskScore,
        String riskLevel,
        List<String> riskReasons
    ) {}
    @PostMapping("/transfers")
    public CreateTransferResponse createTransfer(
        @RequestHeader("Idempotency-Key") String idempotencyKey,
        @Valid @RequestBody CreateTransferRequest request) {
            if (idempotencyKey == null || idempotencyKey.isBlank()) {
                throw new IllegalArgumentException("Missing idempotency key header");
            }
            
            String userId = demoUserId();
            
            TransferEntity t = transferService.createTransfer(
                userId,
                request.fromAccountId(),
                request.toAccountId(),
                request.amount(),
                request.currency(),
                request.memo(),
                idempotencyKey
            );
            
            RiskAssessmentEntity ra = riskRepo.findByTransferId(t.getId()).orElse(null);
            
            Integer riskScore = (ra == null) ? null : ra.getRiskScore();
            String riskLevel = (ra == null) ? null : ra.getLevel();
            List<String> riskReasons = (ra == null) ? List.of() : parseJsonArrayOfStrings(ra.getReasonsJson());
            
            return new CreateTransferResponse(
                t.getId(),
                t.getStatus(),
                t.getAmount(),
                t.getCurrency(),
                riskScore,
                riskLevel,
                riskReasons
            );
        }

    public record TransferSummaryResponse(
        String transferId,
        String status,
        BigDecimal amount,
        String currency,
        String createdAt
    ) {}

@CrossOrigin(origins = "http://localhost:5173")
@GetMapping("/transfers/search")
public List<TransferSummaryResponse> searchTransfers(@RequestParam String prefix) {
    String userId = demoUserId();
    String p = (prefix == null) ? "" : prefix.trim();

    // require at least 6 chars so it’s not “list everything”
    if (p.length() < 6) return List.of();

    return transferRepo
        .findTop10ByUserIdAndIdStartingWithOrderByCreatedAtDesc(userId, p)
        .stream()
        .map(t -> new TransferSummaryResponse(
            t.getId(),
            t.getStatus(),
            t.getAmount(),
            t.getCurrency(),
            t.getCreatedAt().toString()
        ))
        .toList();
}

    public record TransferDetailsResponse(
        String transferId,
        String status,
        BigDecimal amount,
        String currency,
        String memo,
        String fromAccountId,
        String toAccountId,
        String createdAt,
        Integer riskScore,
        String riskLevel,
        List<String> riskReasons
    ) {}

    @CrossOrigin(origins = "http://localhost:5173")
    @GetMapping("/transfers/{transferId}")
    public TransferDetailsResponse getTransfer(@PathVariable String transferId) {
        String userId = demoUserId();

        TransferEntity t = transferRepo.findByUserIdAndId(userId, transferId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transfer not found"));

        RiskAssessmentEntity ra = riskRepo.findByTransferId(t.getId()).orElse(null);

        Integer riskScore = (ra == null) ? null : ra.getRiskScore();
        String riskLevel = (ra == null) ? null : ra.getLevel();
        List<String> riskReasons = (ra == null) ? List.of() : parseJsonArrayOfStrings(ra.getReasonsJson());

        return new TransferDetailsResponse(
            t.getId(),
            t.getStatus(),
            t.getAmount(),
            t.getCurrency(),
            t.getMemo(),            // assuming TransferEntity has getMemo()
            t.getFromAccountId(),   // assuming getter names like these exist
            t.getToAccountId(),
            t.getCreatedAt().toString(), // or t.getCreatedAt() if already a String
            riskScore,
            riskLevel,
            riskReasons
        );
    }


        private static List<String> parseJsonArrayOfStrings(String json) {
            if (json == null) return List.of();
            String trimmed = json.trim();
            if (trimmed.equals("[]")) return List.of();
    
            java.util.regex.Pattern p = java.util.regex.Pattern.compile("\"((?:\\\\.|[^\"])*)\"");
            java.util.regex.Matcher m = p.matcher(trimmed);
    
            java.util.ArrayList<String> out = new java.util.ArrayList<>();
            while (m.find()) {
                String s = m.group(1)
                    .replace("\\\"", "\"")
                    .replace("\\\\", "\\");
                out.add(s);
            }
            return out;
        }
        @CrossOrigin(origins = "http://localhost:5173")
        @GetMapping("/transfers/stats/24h")
        public StatsService.TransferWindowStatsDto stats24h(
        @RequestParam(required = false) String currency
        ) {
    return statsService.last24h(demoUserId(), currency);
    }
}



