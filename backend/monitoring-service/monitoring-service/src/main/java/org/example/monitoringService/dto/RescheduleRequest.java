package org.example.monitoringService.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class RescheduleRequest {

    @NotNull(message = "La nouvelle date est obligatoire")
    private LocalDateTime newDate;

    private String reason;
}
