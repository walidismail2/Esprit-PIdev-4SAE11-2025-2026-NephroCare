package org.example.monitoringService.dto;


import lombok.Builder;
import lombok.Data;
import org.example.monitoringService.entities.enums.AppointmentStatus;
import org.example.monitoringService.entities.enums.AppointmentType;
import java.time.LocalDateTime;

@Data
@Builder
public class AppointmentResponse {
    private String id;
    private String patientId;
    private String patientNom;
    private String patientMatricule;
    private String medecinId;
    private String medecinNom;
    private String medecinSpecialite;
    private LocalDateTime appointmentDate;
    private Integer durationMinutes;
    private AppointmentType type;
    private AppointmentStatus status;
    private String notes;
    private LocalDateTime previousDate;
    private String sessionId;
    private LocalDateTime createdAt;
}
