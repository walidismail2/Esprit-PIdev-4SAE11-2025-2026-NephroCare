package org.example.hospitalizationservice.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.example.hospitalizationservice.enums.ActivityLevel;
import org.example.hospitalizationservice.enums.Gender;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientNutritionProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Identity ──────────────────────────────────────────────────────
    @Column(nullable = false, unique = true)
    @NotBlank
    private String userId;                  // Keycloak subject

    @Column(nullable = false)
    @NotBlank
    private String fullName;

    // ── Anthropometrics ───────────────────────────────────────────────
    @Min(0) @Max(130)
    @Column(nullable = false)
    private int age;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Gender gender;

    @DecimalMin("1.0") @DecimalMax("500.0")
    @Column(nullable = false)
    private double weightKg;

    @DecimalMin("50.0") @DecimalMax("250.0")
    @Column(nullable = false)
    private double heightCm;

    // ── Kidney Function ───────────────────────────────────────────────
    @Min(1) @Max(5)
    @Column(nullable = false)
    private int ckdStage;

    @DecimalMin("0.0") @DecimalMax("200.0")
    @Column(nullable = false)
    private double gfr;

    @DecimalMin("0.0") @DecimalMax("50.0")
    @Column(nullable = false)
    private double creatinineLevel;

    // ── Comorbidities ─────────────────────────────────────────────────
    @Column(nullable = false)
    private boolean diabetic;

    @Column(nullable = false)
    private boolean hypertensive;

    // ── Lifestyle ─────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ActivityLevel activityLevel;

    // ── Derived (not persisted) ────────────────────────────────────────

    @Transient
    public double getBmi() {
        double h = heightCm / 100.0;
        return Math.round((weightKg / (h * h)) * 10.0) / 10.0;
    }



}