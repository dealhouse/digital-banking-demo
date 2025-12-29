/**
 * Core API for MiniBank: Accounts + Transfers + Ledger + persisted RiskAssessments.
 * Local-dev friendly: SQLite file DB + separate FastAPI risk-service.
 * Dashboard calls this API from http://localhost:5173 (CORS enabled).
 */

package com.minibank.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CoreApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(CoreApiApplication.class, args);
	}

}
