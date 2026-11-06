package org.example.monitoringService.entities;


import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.example.monitoringService.entities.enums.AppointmentStatus;
import org.example.monitoringService.entities.enums.AppointmentType;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointment")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // ── Patient (Keycloak) ────────────────────────────────────────
    @NotBlank(message = "patientId obligatoire")
    @Column(name = "patient_id", nullable = false)
    private String patientId;

    @Column(name = "patient_nom")
    private String patientNom;

    @Column(name = "patient_matricule")
    private String patientMatricule;

    // ── Médecin (Keycloak) ────────────────────────────────────────
    @NotBlank(message = "medecinId obligatoire")
    @Column(name = "medecin_id", nullable = false)
    private String medecinId;

    @Column(name = "medecin_nom")
    private String medecinNom;

    @Column(name = "medecin_specialite")
    private String medecinSpecialite;

    // ── RDV ───────────────────────────────────────────────────────
    @NotNull(message = "appointmentDate obligatoire")
    @Column(name = "appointment_date", nullable = false)
    private LocalDateTime appointmentDate;

    @NotNull(message = "durationMinutes obligatoire")
    @Positive(message = "durationMinutes doit être positif")
    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @NotNull(message = "type obligatoire")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppointmentType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AppointmentStatus status = AppointmentStatus.SCHEDULED;

    @Column(length = 1000)
    private String notes;

    // ── F4 : Reschedule ───────────────────────────────────────────
    @Column(name = "previous_date")
    private LocalDateTime previousDate;

    // ── Lien vers MonitoringSession (optionnel) ───────────────────
    @Column(name = "session_id")
    private String sessionId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = AppointmentStatus.SCHEDULED;
    }
}
