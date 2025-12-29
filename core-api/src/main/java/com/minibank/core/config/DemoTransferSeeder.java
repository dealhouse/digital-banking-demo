package com.minibank.core.config;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import tools.jackson.databind.ObjectMapper;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import com.minibank.core.domain.AccountEntity;
import com.minibank.core.domain.LedgerEntryEntity;
import com.minibank.core.domain.RiskAssessmentEntity;
import com.minibank.core.domain.TransferEntity;
import com.minibank.core.domain.UserEntity;
import com.minibank.core.repo.AccountRepository;
import com.minibank.core.repo.LedgerEntryRepository;
import com.minibank.core.repo.RiskAssessmentRepository;
import com.minibank.core.repo.TransferRepository;
import com.minibank.core.repo.UserRepository;

@Configuration
public class DemoTransferSeeder {

    @Bean
    @Order(2)
    CommandLineRunner seedDemoTransfers(
            UserRepository users,
            AccountRepository accounts,
            TransferRepository transfers,
            RiskAssessmentRepository risks,
            LedgerEntryRepository ledger,
            ObjectMapper objectMapper) {
        return args -> {
            String email = "demo@digitalbanking.dev";

            System.out.println("[DemoTransferSeeder] START");

            UserEntity user = users.findByEmail(email).orElse(null);
            if (user == null) {
                System.out.println("[DemoTransferSeeder] demo user not found, exiting");
                return;
            }

            // Avoid reseeding if our first seed transfer already exists
            if (transfers.findByUserIdAndIdempotencyKey(user.getId(), "seed-burst-1").isPresent()) {
                System.out.println("[DemoTransferSeeder] seed already present, exiting");
                return;
            }

            List<AccountEntity> userAccounts = accounts.findAllByUserId(user.getId());
            System.out.println("[DemoTransferSeeder] accounts found: " + userAccounts.size());

            AccountEntity from = findByName(userAccounts, "Velocity Test");
            AccountEntity to = findByName(userAccounts, "High-Interest Savings");

            if (from == null || to == null) {
                System.out.println(
                        "[DemoTransferSeeder] missing accounts: from=" + (from != null) + ", to=" + (to != null));
                return;
            }

            System.out.println("[DemoTransferSeeder] seeding transfers...");

            // Create a burst inside the "last 24h" window (all created now, which is within
            // 24h)
            // Mix amounts to trigger: large_amount + velocity + high_24h_total
            List<BigDecimal> amounts = List.of(
                    bd("120.00"),
                    bd("200.00"),
                    bd("650.00"),
                    bd("75.00"),
                    bd("300.00"),
                    bd("90.00"),
                    bd("700.00"),
                    bd("150.00"));

            // Optional: tiny sleep spacing makes createdAt differ slightly (not required)
            // But since createdAt has no setter, all will still be "now-ish" from
            // PrePersist.

            for (int i = 0; i < amounts.size(); i++) {
                BigDecimal amt = amounts.get(i);

                // Compute window stats BEFORE inserting this transfer (so the risk reasons make
                // sense)
                Instant since = Instant.now().minus(Duration.ofHours(24));
                TransferRepository.WindowStats stats = transfers.windowStats(user.getId(), since, "APPROVED", "CAD");

                int count = stats.getTransferCount();
                BigDecimal total = stats.getTransferTotal() == null ? BigDecimal.ZERO : stats.getTransferTotal();

                // Create transfer
                TransferEntity t = new TransferEntity();
                t.setUserId(user.getId());
                t.setFromAccountId(from.getId());
                t.setToAccountId(to.getId());
                t.setAmount(amt);
                t.setCurrency("CAD");
                t.setStatus("APPROVED");
                t.setIdempotencyKey("seed-burst-" + (i + 1));
                t.setMemo("Seeded burst transfer " + (i + 1));
                t.setCreatedAt(Instant.now().minus(Duration.ofMinutes(10L * i)));

                t = transfers.save(t);

                // Update balances (simple, consistent)
                from.setBalance(from.getBalance().subtract(amt));
                to.setBalance(to.getBalance().add(amt));
                accounts.saveAll(List.of(from, to));

                LedgerEntryEntity debit = new LedgerEntryEntity();
                debit.setAccountId(from.getId());
                debit.setTransferId(t.getId());
                debit.setType("DEBIT");
                debit.setAmount(amt);
                debit.setBalance(from.getBalance()); // ✅ balance AFTER debit
                debit.setCreatedAt(t.getCreatedAt()); // match transfer time

                LedgerEntryEntity credit = new LedgerEntryEntity();
                credit.setAccountId(to.getId());
                credit.setTransferId(t.getId());
                credit.setType("CREDIT");
                credit.setAmount(amt);
                credit.setBalance(to.getBalance()); // ✅ balance AFTER credit
                credit.setCreatedAt(t.getCreatedAt());

                ledger.saveAll(List.of(debit, credit));

                // Risk assessment (local mirror of your FastAPI rules)
                RiskCalc rc = computeRisk(amt, count, total);
                String reasonsJson = objectMapper.writeValueAsString(rc.reasons);

                RiskAssessmentEntity ra = new RiskAssessmentEntity();
                ra.setTransferId(t.getId());
                ra.setRiskScore(rc.score);
                ra.setLevel(scoreToLevel(rc.score));
                ra.setReasonsJson(reasonsJson);

                risks.save(ra);
            }
        };
    }

    private AccountEntity findByName(List<AccountEntity> accounts, String name) {
        return accounts.stream().filter(a -> name.equals(a.getName())).findFirst().orElse(null);
    }

    // Mirrors your FastAPI scoring rules
    private RiskCalc computeRisk(BigDecimal amount, int last24hCount, BigDecimal last24hTotal) {
        int score = 0;
        java.util.List<String> reasons = new java.util.ArrayList<>();

        if (amount.compareTo(bd("500.00")) >= 0) {
            score += 30;
            reasons.add("large_amount");
        }
        if (last24hCount >= 5) {
            score += 25;
            reasons.add("velocity");
        }
        if (last24hTotal.compareTo(bd("1000.00")) >= 0) {
            score += 20;
            reasons.add("high_24h_total");
        }

        if (score > 100)
            score = 100;
        return new RiskCalc(score, reasons);
    }

    private String scoreToLevel(int score) {
        if (score >= 70)
            return "HIGH";
        if (score >= 40)
            return "MEDIUM";
        return "LOW";
    }

    private BigDecimal bd(String v) {
        return new BigDecimal(v);
    }

    private static class RiskCalc {
        final int score;
        final java.util.List<String> reasons;

        RiskCalc(int score, java.util.List<String> reasons) {
            this.score = score;
            this.reasons = reasons;
        }
    }

}
