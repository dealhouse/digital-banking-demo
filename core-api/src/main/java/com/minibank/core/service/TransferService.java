/**
 * Orchestrates the transfer flow:
 * 1) validate request (accounts exist, currency matches, amount > 0, sufficient funds)
 * 2) persist Transfer + ledger entries (source debit, destination credit)
 * 3) compute stats (24h transfer count/total) and request risk score from risk-service
 * 4) persist RiskAssessment linked to the Transfer
 *
 * Important invariants:
 * - ledger stays balanced (debit/credit pair)
 * - DB writes are transactional; risk call may be best-effort (decide fail-open vs fail-closed)
 */

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

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Service
public class TransferService {
    private final AccountRepository accounts;
    private final TransferRepository transfers;
    private final LedgerEntryRepository ledger;
    private final RiskAssessmentRepository riskRepo;
    private final RiskClient riskClient;
    private final StatsService statsService;
    private final ObjectMapper objectMapper;
    private static final Logger log = LoggerFactory.getLogger(TransferService.class);

    public TransferService(
            AccountRepository accounts,
            TransferRepository transfers,
            LedgerEntryRepository ledger,
            RiskAssessmentRepository riskRepo,
            RiskClient riskClient,
            StatsService statsService,
            ObjectMapper objectMapper) {
        this.accounts = accounts;
        this.transfers = transfers;
        this.ledger = ledger;
        this.riskRepo = riskRepo;
        this.riskClient = riskClient;
        this.statsService = statsService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public TransferEntity createTransfer(
            String userId,
            String fromAccountId,
            String toAccountId,
            BigDecimal amount,
            String currency,
            String memo,
            String idempotencyKey) {

        var existing = transfers.findByUserIdAndIdempotencyKey(
                userId,
                idempotencyKey);
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

        // Computes the transfer count/total in the last 24h
        StatsService.TransferWindowStatsDto last24h = statsService.last24h(userId, currency);
        int last24hCount = last24h.count();
        BigDecimal last24hTotal = last24h.sum();

        RiskClient.ScoreResponse riskResp;
        try {
            riskResp = riskClient.scoreTransfer(
                    userId,
                    fromAccountId,
                    toAccountId,
                    amount,
                    currency,
                    last24hCount,
                    last24hTotal);
        } catch (Exception e) {
            log.warn("Risk service call failed; defaulting riskScore=0. error={}", e.toString());
            // Prevents the whole transfer from failing if risk service is temporarily down
            riskResp = new RiskClient.ScoreResponse(0, List.of());
        }

        int score = riskResp.riskScore();
        String level = (score >= 70) ? "HIGH" : (score >= 40) ? "MEDIUM" : "LOW";

        String reasonsJson;
        try {
            reasonsJson = toJsonArray(riskResp.reasons());
        } catch (Exception e) {
            reasonsJson = "[]";
        }

        RiskAssessmentEntity ra = new RiskAssessmentEntity();
        ra.setTransferId(t.getId());
        ra.setRiskScore(score);
        ra.setLevel(level);
        ra.setReasonsJson(reasonsJson);
        riskRepo.save(ra);

        return t;

    }

    private String toJsonArray(List<String> reasons) {
        try {
            return objectMapper.writeValueAsString(reasons == null ? List.of() : reasons);
        } catch (JacksonException e) {
            // fail-soft: keep the service running even if serialization somehow fails
            return "[]";
        }
    }

}
