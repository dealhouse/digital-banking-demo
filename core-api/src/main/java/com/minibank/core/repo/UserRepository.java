package com.minibank.core.repo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.minibank.core.domain.UserEntity;

public interface UserRepository extends JpaRepository<UserEntity, String> {
  Optional<UserEntity> findByEmail(String email);
}
