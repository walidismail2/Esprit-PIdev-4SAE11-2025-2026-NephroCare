package org.example.monitoringService.dto;

import lombok.Builder;
import lombok.Data;
import org.example.monitoringService.entities.enums.Severity;
import org.example.monitoringService.entities.enums.TestType;

import java.time.LocalDateTime;

@Data
@Builder
public class AlertResponseDTO {

    private String id;
    private Severity severity;
    private String message;
    private Double value;
    private TestType type;
    private boolean resolved;
    private String patientMatricule;
    private String orderId;
    private String createdBy;
    private String handledBy;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    private String ageGroup;
    private String kidneyFunctionStage;
}