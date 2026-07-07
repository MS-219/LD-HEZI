package com.ldai.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class InviteeRewardSummary {
    private Long inviteeId;
    private BigDecimal totalReward;
}
