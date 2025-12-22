package com.minibank.core;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.minibank.dto.LoginRequest;
import com.minibank.dto.LoginResponse;
import jakarta.validation.Valid;
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest loginRequest) {
        String token = "demo-token";
        return new LoginResponse(token, loginRequest.getEmail());
    }
}

