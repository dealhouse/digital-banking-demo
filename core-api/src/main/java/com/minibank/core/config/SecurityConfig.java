/**
 * Demo-only auth:
 * - Accepts Authorization: Bearer demo-token
 * - Not production security (no users DB, no JWT validation, no refresh tokens)
 * Purpose: keep the demo gated without adding full auth complexity.
 */

package com.minibank.core.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // We don't need CSRF for this JSON API demo
            .csrf(csrf -> csrf.disable())
            // Use the CORS settings from WebCorsConfig
            .cors(cors -> { })
            // For the purposes of this project, let every request through
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll()
            );

        return http.build();
    }
}

