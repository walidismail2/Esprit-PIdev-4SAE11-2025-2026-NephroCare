package org.example.monitoringService.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import org.example.monitoringService.entities.enums.Severity;
import org.example.monitoringService.entities.enums.TestType;

@Data
public class AlertCreateDTO {

    @NotBlank(message = "Le message est obligatoire")
    @Size(max = 500, message = "Le message ne peut pas dépasser 500 caractères")
    private String message;

    @NotNull(message = "La valeur numérique est obligatoire")
    @DecimalMin(value = "0.0", inclusive = false, message = "La valeur doit être positive")
    private Double value;

    @NotNull(message = "Le type est obligatoire")
    private TestType type;

    @NotBlank(message = "Matricule du patient est obligatoire")
    private String patientMatricule;
}