package esprit.dialysisservice.entities;

import esprit.dialysisservice.entities.enums.DialysisType;
import esprit.dialysisservice.entities.enums.TreatmentStatus;

import esprit.dialysisservice.entities.enums.VascularAccessType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "dialysis_treatments")
public class DialysisTreatment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // External Keys (Links to other Microservices)
    @Column(nullable = false)
    private UUID patientId; // Link to Clinical Module

    @Column(nullable = false)
    private UUID doctorId;  // Link to User Module

    // Configuration Fields
    @Enumerated(EnumType.STRING)
    @Column(name = "dialysis_type", length = 50)
    private DialysisType dialysisType;

    @Column(name = "vascular_access_type", length = 50)
    @Enumerated(EnumType.STRING)
    private VascularAccessType vascularAccessType;

    private Integer frequencyPerWeek; // e.g., 3
    private Integer prescribedDurationMinutes; // e.g., 240

    // Math Inputs (Target)
    private Double targetDryWeight; // kg

    // Status
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50)
    private TreatmentStatus status;

    private LocalDate startDate;
    private String suspensionReason;
    private LocalDateTime suspendedAt;
    private UUID suspendedBy;

}