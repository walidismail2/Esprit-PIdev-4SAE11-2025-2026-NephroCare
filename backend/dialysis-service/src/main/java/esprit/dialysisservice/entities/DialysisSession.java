package esprit.dialysisservice.entities;
import esprit.dialysisservice.entities.enums.DialysisShift;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


import java.time.LocalDateTime;
import java.util.UUID;


@Entity
@Data @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "dialysis_sessions")
public class DialysisSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Relationship: One Treatment -> Many Sessions
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "treatment_id", nullable = false)
    private DialysisTreatment treatment;

    // External Keys
    private UUID nurseId; // Who performed it

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DialysisShift shift;

    @Column(nullable = false)
    private LocalDateTime sessionDate; // slot start datetime (e.g. 2026-02-18T08:00)
    // Machine Data (Physical Inputs)
    private Double weightBefore;
    private Double weightAfter;
    private Double ultrafiltrationVolume; // Liters removed

    // Safety Data
    private String preBloodPressure;
    private String complications;

    // Math Data
    private Double preDialysisUrea;
    private Double postDialysisUrea;
    private Double achievedKtV;
    private Double urr;     // percentage 0..100
    private Double spKtV;   // Daugirdas spKt/V
    private Double eKtV;    // equilibrated Kt/V (estimate)
}