package esprit.dialysisservice.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "session_report",
        uniqueConstraints = @UniqueConstraint(name = "uk_session_report_session", columnNames = "session_id")
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SessionReport {

    @Id
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "treatment_id", nullable = false)
    private UUID treatmentId;

    @Column(name = "patient_id", nullable = false)
    private UUID patientId;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @Column(name = "generated_by")
    private UUID generatedBy;

    @Column(name = "ktv_threshold")
    private Double ktvThreshold;

    @Column(name = "urr_threshold")
    private Double urrThreshold;

    @Column(name = "report_json", columnDefinition = "json", nullable = false)
    private String reportJson; // store serialized JSON string

    @Lob
    @Column(name = "report_text", columnDefinition = "LONGTEXT", nullable = false)
    private String reportText;
}
