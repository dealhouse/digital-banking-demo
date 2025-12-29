/**
 * Centralized error mapping so controllers/services can throw domain exceptions.
 * Guarantees a consistent JSON error shape for the dashboard.
 */

package com.minibank.core.web.error;

import java.time.Instant;
import java.util.Map;

public record ApiError(
    Instant timestamp,
    int status,
    String error,
    String message,
    String path,
    Map<String, Object> details
) {
    public static ApiError of (
        int status, 
        String error, 
        String message, 
        String path,
        Map<String, Object> details
    ) {
        return new ApiError(
            Instant.now(),
            status,
            error,
            message,
            path,
            details
        );
    }
}
