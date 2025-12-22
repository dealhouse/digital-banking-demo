package com.minibank.dto;

import java.util.List;

public record RiskScoreResponse( 
    int riskScore,
    List<String> reasons
) {}
