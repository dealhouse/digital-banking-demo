package com.minibank.core.repo;

import com.minibank.core.domain.RiskAssessmentEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface RiskAssessmentRepository extends JpaRepository<RiskAssessmentEntity, String> {
    Optional<RiskAssessmentEntity> findByTransferId(String transferId);
    List<RiskAssessmentEntity> findByRiskScoreGreaterThanEqual(Integer minScore);
}

