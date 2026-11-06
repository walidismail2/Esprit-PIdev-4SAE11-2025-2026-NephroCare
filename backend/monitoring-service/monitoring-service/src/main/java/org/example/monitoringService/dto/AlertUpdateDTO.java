package org.example.monitoringService.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class AlertUpdateDTO {

    @NotBlank(message = "Le message est obligatoire")
    @Size(max = 500)
    private String message;

    @NotNull(message = "La valeur est obligatoire")
    @DecimalMin(value = "0.0", inclusive = false)
    private Double value;

    // Optionnel
    private String kidneyFunctionStage;
}