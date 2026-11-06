package esprit.dialysisservice.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alert {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private UUID patientId;

    @Column(nullable = false)
    private UUID sessionId;

    @Column(nullable = false, length = 20)
    private String severity;   // INFO, WARNING, CRITICAL

    @Column(nullable = false, length = 30)
    private String category;   // ADEQUACY, HEMODYNAMIC, WEIGHT, COMPLICATION, GLOBAL

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(nullable = false, length = 20)
    private String status;     // OPEN, ACKNOWLEDGED, RESOLVED

    @Column(nullable = false)
    private LocalDateTime createdAt;
}