package com.minibank.core.config;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.minibank.core.domain.AccountEntity;
import com.minibank.core.domain.UserEntity;
import com.minibank.core.repo.AccountRepository;
import com.minibank.core.repo.UserRepository;

@Configuration
public class DemoDataSeeder {

    @Bean
    CommandLineRunner seed(UserRepository users, AccountRepository accounts) {
        return args -> {
            String email = "demo@digitalbanking.dev";
            UserEntity user = users.findByEmail(email).orElseGet(() -> {
                UserEntity u = new UserEntity();
                u.setEmail(email);
                return users.save(u);
            });

            if (accounts.findAllByUserId(user.getId()).isEmpty()) {
                AccountEntity checking = new AccountEntity();
                checking.setUserId(user.getId());
                checking.setName("Everyday Checking");
                checking.setType("CHECKING");
                checking.setCurrency("CAD");
                checking.setBalance(new BigDecimal("2500.00"));

                AccountEntity savings = new AccountEntity();
                savings.setUserId(user.getId());
                savings.setName("High-Interest Savings");
                savings.setType("SAVINGS");
                savings.setCurrency("CAD");
                savings.setBalance(new BigDecimal("5000.00"));

                accounts.saveAll(List.of(checking, savings));
            }
        };
    }
}
