package com.minibank.core.config;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import com.minibank.core.domain.AccountEntity;
import com.minibank.core.domain.UserEntity;
import com.minibank.core.repo.AccountRepository;
import com.minibank.core.repo.UserRepository;

@Configuration
public class DemoDataSeeder {

    @Bean
    @Order(1)
    CommandLineRunner seed(UserRepository users, AccountRepository accounts) {
        return args -> {
            String email = "demo@digitalbanking.dev";

            UserEntity user = users.findByEmail(email).orElseGet(() -> {
                UserEntity u = new UserEntity();
                u.setEmail(email);
                return users.save(u);
            });

            // Fetch existing accounts once (avoid repeated DB calls)
            List<AccountEntity> existing = accounts.findAllByUserId(user.getId());

            ensureAccount(existing, accounts, user.getId(),
                    "Everyday Checking", "CHECKING", "CAD", new BigDecimal("2500.00"));

            ensureAccount(existing, accounts, user.getId(),
                    "High-Interest Savings", "SAVINGS", "CAD", new BigDecimal("5000.00"));

            // Extra accounts for testing
            ensureAccount(existing, accounts, user.getId(),
                    "Bills", "CHECKING", "CAD", new BigDecimal("800.00"));

            ensureAccount(existing, accounts, user.getId(),
                    "New Account", "CHECKING", "CAD", new BigDecimal("150.00"));

            ensureAccount(existing, accounts, user.getId(),
                    "Velocity Test", "CHECKING", "CAD", new BigDecimal("3000.00"));
        };
    }

    private void ensureAccount(
            List<AccountEntity> existing,
            AccountRepository accounts,
            String userId, 
            String name,
            String type,
            String currency,
            BigDecimal balance
    ) {
        boolean alreadyThere = existing.stream()
                .anyMatch(a -> name.equals(a.getName()));

        if (alreadyThere) return;

        AccountEntity a = new AccountEntity();
        a.setUserId(userId);
        a.setName(name);
        a.setType(type);
        a.setCurrency(currency);
        a.setBalance(balance);

        accounts.save(a);
        existing.add(a); // keep list in sync
    }
}

