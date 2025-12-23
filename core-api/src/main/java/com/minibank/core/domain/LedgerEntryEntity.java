package com.minibank.core.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "ledger_entries")
public class LedgerEntryEntity {
    @Id
    private String id;

    @Column(nullable = false)
    private String accountId;

    @Column(nullable = false)
    private String transferId;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false, precision = 18, scale = 2) // necessary for financial precision
    private BigDecimal amount;

    @Column(nullable = false, precision = 18, scale = 2) // necessary for financial precision
    private BigDecimal balance;

    @Column(nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID().toString();
        if (createdAt == null) createdAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getAccountId() {
        return accountId;
    }

    public String getTransferId() {
        return transferId;
    }

    public String getType() {
        return type;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setAccountId(String accountId) {
        this.accountId = accountId;
    }
    public void setTransferId(String transferId) {
        this.transferId = transferId;
    }

    public void setType(String type) {
        this.type = type;
    }
    
    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }


}
