package org.example.monitoringService.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.example.monitoringService.entities.enums.Severity;
import org.example.monitoringService.entities.enums.TestType;

import java.time.LocalDateTime;

@Entity
@Table(name = "alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @NotBlank(message = "Le message est obligatoire")
    @Size(max = 500)
    @Column(nullable = false, length = 500)
    private String message;

    @NotNull(message = "La valeur est obligatoire")
    @Column(nullable = false)
    private Double value;

    // ✅ TYPE UNIQUE (CORRIGÉ)
    @NotNull(message = "Le type est obligatoire")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TestType type;

    @NotNull(message = "La sévérité est obligatoire")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Severity severity;

    @Builder.Default
    private boolean resolved = false;

    @NotBlank(message = "Le matricule patient est obligatoire")
    @Column(name = "patient_matricule", nullable = false)
    private String patientMatricule;

    private String orderId;
    private String createdBy;
    private String handledBy;

    private LocalDateTime resolvedAt;

    private String ageGroup;

    private String kidneyFunctionStage;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}