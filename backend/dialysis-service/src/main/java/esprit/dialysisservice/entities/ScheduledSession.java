package esprit.dialysisservice.entities;

import esprit.dialysisservice.entities.enums.DialysisShift;
import esprit.dialysisservice.entities.enums.NurseConfirmationStatus;
import esprit.dialysisservice.entities.enums.ScheduledStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "scheduled_session",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"treatment_id","day","shift"}),
                @UniqueConstraint(columnNames = {"nurse_id","day","shift"})
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ScheduledSession {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name="session_id")
    private UUID sessionId;

    @Column(name = "treatment_id", nullable = false)
    private UUID treatmentId;

    @Column(name = "patient_id", nullable = false)
    private UUID patientId;

    @Column(nullable = false)
    private LocalDate day;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DialysisShift shift;

    @Column(name="nurse_id")
    private UUID nurseId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScheduledStatus status;

    // ===== Nurse confirmation workflow =====
    @Enumerated(EnumType.STRING)
    @Column(name="nurse_confirmation", nullable = false)
    private NurseConfirmationStatus nurseConfirmation = NurseConfirmationStatus.PENDING;

    @Column(name="nurse_confirmed_at")
    private LocalDateTime nurseConfirmedAt;

    @Column(name="nurse_rejected_reason", length = 255)
    private String nurseRejectedReason;

    @Column(name="reassigned_from_nurse_id")
    private UUID reassignedFromNurseId;

    @Column(name="last_assignment_at", nullable = false)
    private LocalDateTime lastAssignmentAt;

    // audit
    private LocalDateTime createdAt;
    private String createdBy;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (lastAssignmentAt == null) lastAssignmentAt = createdAt;
        if (nurseConfirmation == null) nurseConfirmation = NurseConfirmationStatus.PENDING;
    }
}