package com.minibank.core.web.error;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;

@RestControllerAdvice
public class ApiExceptionHandler {
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, Object> details = new HashMap<>();
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
            .forEach(error -> fieldErrors.put(error.getField(), error.getDefaultMessage()));
        details.put("fieldErrors", fieldErrors);

        ApiError body = ApiError.of(
            HttpStatus.BAD_REQUEST.value(),
            "VALIDATION_ERROR",
            "Request validation failed",
            req.getRequestURI(),
            details
        );

        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<ApiError> handleMissingHeader(MissingRequestHeaderException ex, HttpServletRequest req) {
        ApiError body = ApiError.of(
            HttpStatus.BAD_REQUEST.value(),
            "MISSING_HEADER",
            ex.getMessage(),
            req.getRequestURI(),
            Map.of("headerName", ex.getHeaderName())
        );
        return ResponseEntity.badRequest().body(body);
    }


    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest req) {
        ApiError body = ApiError.of(
            HttpStatus.BAD_REQUEST.value(),
            "CONSTRAINT_VIOLATION_ERROR",
            ex.getMessage(),
            req.getRequestURI(),
            Map.of()
        );
        
        return ResponseEntity.badRequest().body(body);
    }
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleBadRequest(IllegalArgumentException ex, HttpServletRequest req) {
        ApiError body = ApiError.of(
            HttpStatus.BAD_REQUEST.value(),
            "BAD_REQUEST",
            ex.getMessage(),
            req.getRequestURI(),
            Map.of()
        );
        
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception ex, HttpServletRequest req) {
        ApiError body = ApiError.of(
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "INTERNAL_ERROR",
            "Unexpected error",
            req.getRequestURI(),
            Map.of()
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

}
