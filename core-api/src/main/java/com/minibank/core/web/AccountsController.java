package com.minibank.core.web;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.minibank.core.domain.AccountEntity;
import com.minibank.core.domain.LedgerEntryEntity;
import com.minibank.core.repo.AccountRepository;
import com.minibank.core.repo.LedgerEntryRepository;
import com.minibank.core.repo.UserRepository;

@RestController
@RequestMapping("/api")
public class AccountsController {
    
    private final AccountRepository accounts;
    private final LedgerEntryRepository ledger;
    private final UserRepository users;

    public AccountsController(AccountRepository accounts, LedgerEntryRepository ledger, UserRepository users) {
        this.accounts = accounts;
        this.ledger = ledger;
        this.users = users;
    }

    private String demoUserId() {
    return users.findByEmail("demo@digitalbanking.dev").orElseThrow().getId();
  }

    @GetMapping("/accounts")
    public List<AccountEntity> accounts() {
        return accounts.findAllByUserId(demoUserId());
    }

    @GetMapping("/accounts/{accountId}/ledger")
    public List<LedgerEntryEntity> accountLedger(@PathVariable String accountId) {
        return ledger.findAllByAccountIdOrderByCreatedAtDesc(accountId);
    }
}
