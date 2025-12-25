package com.minibank.core.repo;

import java.util.Optional;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.minibank.core.domain.TransferEntity;
public interface TransferRepository extends JpaRepository<TransferEntity, String> {
  Optional<TransferEntity> findByUserIdAndIdempotencyKey(String userId, String idempotencyKey);

  List<TransferEntity> findTop10ByUserIdAndIdStartingWithOrderByCreatedAtDesc(String userId, String prefix);

  Optional<TransferEntity> findByUserIdAndId(String userId, String id);
  
}
