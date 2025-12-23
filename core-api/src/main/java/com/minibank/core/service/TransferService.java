package com.minibank.core.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;

import com.minibank.core.domain.LedgerEntryEntity;
import com.minibank.core.domain.RiskAssessmentEntity;
import com.minibank.core.domain.TransferEntity;
import com.minibank.core.repo.AccountRepository;
import com.minibank.core.repo.LedgerEntryRepository;
import com.minibank.core.repo.RiskAssessmentRepository;
import com.minibank.core.repo.TransferRepository;

import jakarta.transaction.Transactional;

import com.minibank.core.client.RiskClient;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


@Service
public class TransferService {
    private final AccountRepository accounts;
    private final TransferRepository transfers;
    private final LedgerEntryRepository ledger;
    private final RiskAssessmentRepository riskRepo;
    private final RiskClient riskClient;
    private static final Logger log = LoggerFactory.getLogger(TransferService.class);

    public TransferService(
            AccountRepository accounts,
            TransferRepository transfers,
            LedgerEntryRepository ledger,
            RiskAssessmentRepository riskRepo,
            RiskClient riskClient

    ) {
        this.accounts = accounts;
        this.transfers = transfers;
        this.ledger = ledger;
        this.riskRepo = riskRepo;
        this.riskClient = riskClient;
    }
    
    
    
    @Transactional
    public TransferEntity createTransfer(
        String userId,
        String fromAccountId,
        String toAccountId,
        BigDecimal amount,
        String currency,
        String memo,
        String idempotencyKey
    ) {
        
        
        var existing = transfers.findByUserIdAndIdempotencyKey(
            userId,
            idempotencyKey
        );
        if (existing.isPresent()) {
            return existing.get();
        }
        
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        if (fromAccountId.equals(toAccountId)) {
            throw new IllegalArgumentException("Source and destination accounts must be different");
        }
        
        var from = accounts.findById(fromAccountId).orElseThrow();
        var to = accounts.findById(toAccountId).orElseThrow();
        
        if (!from.getUserId().equals(userId) || !to.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Accounts must belong to the user");
        }
        
        if (!from.getCurrency().equals(currency) || !to.getCurrency().equals(currency)) {
            throw new IllegalArgumentException("Currency Mismatch");
        }
        if (from.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient funds");
        }
        
        TransferEntity t = new TransferEntity();
        t.setUserId(userId);
        t.setFromAccountId(fromAccountId);
        t.setToAccountId(toAccountId);
        t.setAmount(amount);
        t.setCurrency(currency);
        t.setMemo(memo);
        t.setStatus("APPROVED");
        t.setIdempotencyKey(idempotencyKey);
        t = transfers.save(t);
        
        from.setBalance(from.getBalance().subtract(amount));
        to.setBalance(to.getBalance().add(amount));
        accounts.saveAll(List.of(from, to));
        
        LedgerEntryEntity debit = new LedgerEntryEntity();
        debit.setAccountId(fromAccountId);
        debit.setTransferId(t.getId());
        debit.setType("DEBIT");
        debit.setAmount(amount);
        debit.setBalance(from.getBalance());
        
        LedgerEntryEntity credit = new LedgerEntryEntity();
        credit.setAccountId(toAccountId);
        credit.setTransferId(t.getId());
        credit.setType("CREDIT");
        credit.setAmount(amount);
        credit.setBalance(to.getBalance());
        
        ledger.saveAll(List.of(debit, credit));
        
        int last24hCount = 0;
        var last24hTotal = BigDecimal.ZERO; 
        
        RiskClient.ScoreResponse riskResp;
        try {
            riskResp = riskClient.scoreTransfer(
                userId,
                fromAccountId,
                toAccountId,
                amount,
                currency,
                last24hCount,
                last24hTotal
            );
        } catch (Exception e) {
            log.warn("Risk service call failed; defaulting riskScore=0. error={}", e.toString());
            // Don't fail the whole transfer if risk service is temporarily down
            riskResp = new RiskClient.ScoreResponse(0, List.of());
        }
        
        int score = riskResp.riskScore();
        String level =
        (score >= 70) ? "HIGH" :
        (score >= 40) ? "MEDIUM" : "LOW";
        
        String reasonsJson;
        try {
            reasonsJson = toJsonArray(riskResp.reasons());
        } catch (Exception e) {
            reasonsJson = "[]";
        }
        
        // Persist RiskAssessment (example)
        RiskAssessmentEntity ra = new RiskAssessmentEntity();
        ra.setTransferId(t.getId());
        ra.setRiskScore(score);
        ra.setLevel(level);
        ra.setReasonsJson(reasonsJson);
        riskRepo.save(ra);
        
        
        return t;
        
    }
    private static String toJsonArray(List<String> reasons) {
        if (reasons == null || reasons.isEmpty()) return "[]";
    StringBuilder sb = new StringBuilder();
    sb.append("[");
    for (int i = 0; i < reasons.size(); i++) {
        if (i > 0) sb.append(",");
        String s = reasons.get(i).replace("\\", "\\\\").replace("\"", "\\\"");
        sb.append("\"").append(s).append("\"");
    }
    sb.append("]");
    return sb.toString();
    }

}
