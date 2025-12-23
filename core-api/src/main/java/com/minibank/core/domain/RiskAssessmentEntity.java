package com.minibank.core.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "risk_assessments")
public class RiskAssessmentEntity {
    @Id
    private String id;

    @Column(nullable = false)
    private String transferId;

    @Column(nullable = false)
    private Integer riskScore;

    @Column(nullable = false)
    private String level; // "LOW" / "MEDIUM" / "HIGH"

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reasonsJson;

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

    public String getTransferId() {
        return transferId;
    }

    public Integer getRiskScore() {
        return riskScore;
    }

    public String getLevel() {
        return level;
    }

    public String getReasonsJson() {
        return reasonsJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setTransferId(String transferId) {
        this.transferId = transferId;
    }

    public void setRiskScore(Integer riskScore) {
        this.riskScore = riskScore;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setReasonsJson(String reasonsJson) {
        this.reasonsJson = reasonsJson;
    }
    
}
