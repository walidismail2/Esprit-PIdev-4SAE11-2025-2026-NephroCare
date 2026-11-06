package org.example.monitoringService.dto;


import jakarta.validation.constraints.*;
import lombok.Data;
import org.example.monitoringService.entities.enums.AppointmentStatus;
import org.example.monitoringService.entities.enums.AppointmentType;
import java.time.LocalDateTime;

@Data
public class AppointmentRequest {

    @NotBlank(message = "patientId obligatoire")
    private String patientId;

    private String patientNom;
    private String patientMatricule;

    @NotBlank(message = "medecinId obligatoire")
    private String medecinId;

    private String medecinNom;
    private String medecinSpecialite;

    @NotNull(message = "appointmentDate obligatoire")
    private LocalDateTime appointmentDate;

    @NotNull @Positive(message = "durationMinutes doit être positif")
    private Integer durationMinutes;

    @NotNull(message = "type obligatoire")
    private AppointmentType type;

    private AppointmentStatus status;
    private String notes;
}
