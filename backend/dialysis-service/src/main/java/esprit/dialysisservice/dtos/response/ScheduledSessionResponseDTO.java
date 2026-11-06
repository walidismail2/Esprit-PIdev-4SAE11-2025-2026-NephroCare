package esprit.dialysisservice.dtos.response;

import esprit.dialysisservice.entities.enums.DialysisShift;
import esprit.dialysisservice.entities.enums.ScheduledStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class ScheduledSessionResponseDTO {
    private UUID id;
    private UUID treatmentId;
    private UUID patientId;
    private UUID nurseId;

    private LocalDate day;
    private DialysisShift shift;
    private ScheduledStatus status;

    private UUID sessionId;
}