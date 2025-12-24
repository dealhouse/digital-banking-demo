package com.minibank.core.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class RiskClientConfig {

    @Bean
    RestClient riskRestClient(RestClient.Builder builder,
                              @Value("${risk.base-url}") String baseUrl) {

        HttpComponentsClientHttpRequestFactory factory =
                new HttpComponentsClientHttpRequestFactory();

        return builder
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();
    }
}
