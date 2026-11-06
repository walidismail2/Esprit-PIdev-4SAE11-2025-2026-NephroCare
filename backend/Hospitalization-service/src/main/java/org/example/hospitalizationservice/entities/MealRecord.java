// MealRecord.java
package org.example.hospitalizationservice.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.example.hospitalizationservice.enums.MealType;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MealRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Meal type is required")
    @Enumerated(EnumType.STRING)
    private MealType mealType;

    @NotNull
    private LocalDateTime recordedAt;

    @NotNull @Min(0) @Max(3000) private Integer calories;
    @NotNull @Min(0) @Max(400)  private Integer proteinG;
    @NotNull @Min(0) @Max(600)  private Integer carbsG;
    @NotNull @Min(0) @Max(200)  private Integer fatG;

    /**
     * 0 = refused, 100 = fully consumed.
     * Used by Feature 2 (weighted intake) and Feature 3 (compliance scoring).
     */
    @NotNull @Min(0) @Max(100)
    private Integer consumptionPercent;

    @Size(max = 255)
    private String notes;

    private String recordedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nutrition_plan_id", nullable = false)
    @JsonBackReference("plan-meals")
    private NutritionPlan nutritionPlan;
}