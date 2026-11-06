package esprit.dialysisservice.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuspendedTreatmentAuditDTO {

    private UUID treatmentId;

    private UUID patientId;
    private String patientName; // optional but useful for UI

    private UUID doctorId;

    private String dialysisType;
    private String vascularAccessType;

    private String suspendedReason;
    private LocalDateTime suspendedAt;

    private Integer frequencyPerWeek;
}
