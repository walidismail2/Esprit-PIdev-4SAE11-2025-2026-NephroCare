package org.example.hospitalizationservice.repository;

import org.example.hospitalizationservice.entities.NutritionPlan;
import org.example.hospitalizationservice.enums.NutritionRiskLevel;
import org.example.hospitalizationservice.enums.NutritionTrend;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NutritionPlanRepository extends JpaRepository<NutritionPlan, Long> {

    // ── Lookups ────────────────────────────────────────────────────────────────
    // No @Query needed: NutritionPlan has a plain `hospitalizationId` Long field,
    // so Spring Data resolves these as direct column lookups (no JOIN).
    Optional<NutritionPlan> findByHospitalizationId(Long hospitalizationId);

    boolean existsByHospitalizationId(Long hospitalizationId);

    // ── Targeted column updates ────────────────────────────────────────────────
    // Avoids the merge-SELECT that save() triggers on a detached entity.
    // Each method issues a single UPDATE … SET … WHERE id = ? — no prior SELECT.

    @Modifying
    @Query("UPDATE NutritionPlan p SET p.riskLevel = :risk WHERE p.id = :id")
    void updateRiskLevel(@Param("id") Long id, @Param("risk") NutritionRiskLevel risk);

    @Modifying
    @Query("UPDATE NutritionPlan p SET p.trend = :trend WHERE p.id = :id")
    void updateTrend(@Param("id") Long id, @Param("trend") NutritionTrend trend);
}