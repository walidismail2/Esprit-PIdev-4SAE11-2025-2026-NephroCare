// MealRecordRepository.java
package org.example.hospitalizationservice.repository;

import org.example.hospitalizationservice.entities.MealRecord;
import org.example.hospitalizationservice.entities.NutritionPlan;
import org.example.hospitalizationservice.enums.MealType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface MealRecordRepository extends JpaRepository<MealRecord, Long> {

    // Feature 2 — daily summary
    @Query("""
        SELECT m FROM MealRecord m
        WHERE m.nutritionPlan = :plan
          AND CAST(m.recordedAt AS date) = :date
        ORDER BY m.recordedAt
    """)
    List<MealRecord> findByPlanAndDate(
            @Param("plan") NutritionPlan plan,
            @Param("date") LocalDate date
    );

    // Feature 3 & 4 — risk and trend (last N days)
    @Query("""
        SELECT m FROM MealRecord m
        WHERE m.nutritionPlan = :plan
          AND m.recordedAt >= :from
        ORDER BY m.recordedAt
    """)
    List<MealRecord> findByPlanSince(
            @Param("plan") NutritionPlan plan,
            @Param("from") java.time.LocalDateTime from
    );

    @Query("SELECT m FROM MealRecord m " +
            "WHERE m.nutritionPlan.id = :planId " +
            "AND m.recordedAt >= :from " +
            "AND m.recordedAt < :to " +
            "ORDER BY m.recordedAt")
    List<MealRecord> findByPlanIdAndDateRange(
            @Param("planId") Long planId,
            @Param("from")   LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    List<MealRecord> findByNutritionPlanOrderByRecordedAtDesc(NutritionPlan plan);

    boolean existsByNutritionPlanAndMealType(NutritionPlan plan, MealType mealType);
}