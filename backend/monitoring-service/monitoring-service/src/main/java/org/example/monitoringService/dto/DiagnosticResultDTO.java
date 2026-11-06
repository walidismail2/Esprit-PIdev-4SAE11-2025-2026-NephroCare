package org.example.monitoringService.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import org.example.monitoringService.entities.enums.TestType;

@Data
public class DiagnosticResultDTO {

    private TestType testType; // CREATININE, POTASSIUM, UREA, GFR, PROTEINURIA...

    @NotNull(message = "La valeur numérique est obligatoire")
    private Double numericValue;

    @NotBlank(message = "L'orderId est obligatoire")
    private String orderId;

    private boolean abnormal;

    // Contexte pédiatrique
    private String patientMatricule;
    private Integer patientAgeMonths; // Age en mois (plus précis pour nourrissons)
    private Double weight;            // Poids en kg (utilisé pour calcul eGFR pédiatrique)
}