package esprit.dialysisservice.dtos.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlertResponseDTO {
    private UUID id;
    private UUID patientId;
    private UUID sessionId;
    private String severity;
    private String category;
    private String title;
    private String message;
    private String status;
    private LocalDateTime createdAt;
}