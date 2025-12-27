package com.minibank.core.repo;

import java.util.Optional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.minibank.core.domain.TransferEntity;
public interface TransferRepository extends JpaRepository<TransferEntity, String> {

  interface WindowStats {
    int getTransferCount();
    BigDecimal getTransferTotal();
  }

  Optional<TransferEntity> findByUserIdAndIdempotencyKey(String userId, String idempotencyKey);

  List<TransferEntity> findTop10ByUserIdAndIdStartingWithOrderByCreatedAtDesc(String userId, String prefix);

  Optional<TransferEntity> findByUserIdAndId(String userId, String id);

  @Query("""
      select
        count(t) as transferCount,
        sum(t.amount) as transferTotal
      from TransferEntity t
      where t.userId = :userId
          and t.createdAt >= :since
          and t.status = :status
          and (:currency is null or t.currency = :currency)
      """)
      WindowStats windowStats(
        @Param("userId") String userId,
        @Param("since") Instant since,
        @Param("status") String status,
        @Param("currency") String currency
      );
  
}
