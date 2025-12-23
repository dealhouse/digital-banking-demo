package com.minibank.core.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.minibank.core.domain.LedgerEntryEntity;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntryEntity, String> {
  List<LedgerEntryEntity> findAllByAccountIdOrderByCreatedAtDesc(String accountId);
}

