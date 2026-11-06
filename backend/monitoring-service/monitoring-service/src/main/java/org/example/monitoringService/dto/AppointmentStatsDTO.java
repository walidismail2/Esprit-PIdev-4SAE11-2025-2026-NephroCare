package org.example.monitoringService.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentStatsDTO {

    private String medecinId;
    private String medecinNom;
    private String type;
    private Long total;
    private Long noShowCount;
    private Long cancelledCount;
    private Double noShowRate;
    private Double cancelRate;

    public AppointmentStatsDTO(String medecinId, Long total, Long confirmed, Long cancelled) {
        this.medecinId = medecinId;
        this.total = total;
        this.noShowCount = confirmed; // ou adapte selon ton besoin
        this.cancelledCount = cancelled;
    }
}