package esprit.dialysisservice.dtos.response;


import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SessionReportResponseDTO {
    private UUID id;
    private UUID sessionId;
    private UUID treatmentId;
    private UUID patientId;

    private LocalDateTime generatedAt;
    private UUID generatedBy;

    private Double ktvThreshold;
    private Double urrThreshold;

    private Object reportJson;
    private String reportText;
}