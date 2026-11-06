package esprit.dialysisservice.entities;

import esprit.dialysisservice.entities.enums.DialysisShift;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "session_conflict_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionConflictLog {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private UUID treatmentId;

    @Column(nullable = false)
    private UUID patientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DialysisShift shift;

    @Column(nullable = false)
    private LocalDate sessionDay;

    @Column(nullable = false)
    private Integer used;

    @Column(nullable = false)
    private Integer capacity;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private UUID createdBy; // nurse id
}
