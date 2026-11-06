package org.example.hospitalizationservice.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.example.hospitalizationservice.enums.DietType;
import org.example.hospitalizationservice.enums.NutritionRiskLevel;
import org.example.hospitalizationservice.enums.NutritionTrend;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NutritionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Diet type is required")
    @Enumerated(EnumType.STRING)
    private DietType dietType;

    @NotNull @Min(500) @Max(5000)
    private Integer targetCalories;

    @NotNull @Min(0) @Max(500)
    private Integer targetProteinG;

    @NotNull @Min(0) @Max(800)
    private Integer targetCarbsG;

    @NotNull @Min(0) @Max(300)
    private Integer targetFatG;

    @Size(max = 255)
    private String notes;

    private LocalDateTime createdAt = LocalDateTime.now();

    private String prescribedBy;

    @Enumerated(EnumType.STRING)
    private NutritionRiskLevel riskLevel = NutritionRiskLevel.NORMAL;

    @Enumerated(EnumType.STRING)
    private NutritionTrend trend = NutritionTrend.STABLE;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hospitalization_id", nullable = false, unique = true)
    @JsonBackReference("hosp-nutrition")
    //   serialized outside a @JsonManagedReference context
    private Hospitalization hospitalization;

    // ✅ FIX: shadow FK field — read-only view of the same hospitalization_id column.
    //    Spring Data's findByHospitalizationId / existsByHospitalizationId will now
    //    generate "WHERE hospitalization_id = ?" directly, with no JOIN at all.
    //    insertable/updatable = false ensures only the @OneToOne above manages the column.
    @Column(name = "hospitalization_id", insertable = false, updatable = false)
    private Long hospitalizationId;

    @OneToMany(mappedBy = "nutritionPlan", cascade = {CascadeType.PERSIST, CascadeType.REMOVE}, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<MealRecord> mealRecords = new ArrayList<>();
}