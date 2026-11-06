package org.example.monitoringService.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ConflictResponse {
    private boolean hasConflict;
    private String message;
    private List<AppointmentResponse> conflicts;
}