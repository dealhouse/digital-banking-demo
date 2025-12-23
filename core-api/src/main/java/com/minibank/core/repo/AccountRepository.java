package com.minibank.core.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.minibank.core.domain.AccountEntity;
public interface AccountRepository extends JpaRepository<AccountEntity, String> {
  List<AccountEntity> findAllByUserId(String userId);
}
