package org.example.monitoringService.dto;


import lombok.Builder;
import lombok.Data;
import org.example.monitoringService.entities.enums.AppointmentStatus;
import org.example.monitoringService.entities.enums.AppointmentType;
import java.time.LocalDateTime;

@Data
@Builder
public class AppointmentHistoryDTO {
    private String id;
    private LocalDateTime appointmentDate;
    private AppointmentType type;
    private AppointmentStatus status;
    private String medecinNom;
    private String medecinSpecialite;
    private Integer durationMinutes;
    private String notes;
    private LocalDateTime previousDate;
    private String sessionId; // session liée si elle existe
}
