package org.example.monitoringService.dto;


import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ConflictCheckRequest {

    @NotBlank(message = "medecinId obligatoire")
    private String medecinId;

    @NotBlank(message = "patientId obligatoire")
    private String patientId;

    @NotNull(message = "appointmentDate obligatoire")
    private LocalDateTime appointmentDate;

    @NotNull @Positive
    private Integer durationMinutes;

    // Pour exclure le RDV courant lors d'un reschedule
    private String excludeAppointmentId;
}
