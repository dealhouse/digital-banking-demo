package com.minibank.core.web;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.minibank.core.domain.RiskAssessmentEntity;
import com.minibank.core.domain.TransferEntity;
import com.minibank.core.repo.RiskAssessmentRepository;
import com.minibank.core.repo.UserRepository;
import com.minibank.core.service.TransferService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class TransfersController {
    
    private final TransferService transferService;
    private final RiskAssessmentRepository riskRepo;
    private final UserRepository users;
    
    public TransfersController(TransferService transferService, RiskAssessmentRepository riskRepo, UserRepository users) {
        this.transferService = transferService;
        this.riskRepo = riskRepo;
        this.users = users;
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
}
