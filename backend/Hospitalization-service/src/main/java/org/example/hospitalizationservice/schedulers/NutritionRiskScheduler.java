// NutritionRiskScheduler.java
package org.example.hospitalizationservice.schedulers;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.hospitalizationservice.entities.NutritionPlan;
import org.example.hospitalizationservice.repository.NutritionPlanRepository;
import org.example.hospitalizationservice.service.NutritionRiskService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class NutritionRiskScheduler {

    private final NutritionRiskService    riskService;
    private final NutritionPlanRepository nutritionPlanRepository;

    /**
     * Runs every day at 06:00.
     * Re-evaluates the risk level for every active nutrition plan
     * and persists the result so the frontend always reads a fresh value.
     */
    @Scheduled(cron = "0 0 6 * * *")
    public void refreshAllRiskLevels() {
        List<NutritionPlan> plans = nutritionPlanRepository.findAll();
        log.info("[NutritionRiskScheduler] Running daily risk assessment for {} plans", plans.size());

        int updated = 0;
        for (NutritionPlan plan : plans) {
            try {
                riskService.assessAndPersist(plan);
                updated++;
            } catch (Exception e) {
                log.error("[NutritionRiskScheduler] Failed to assess plan id={}: {}", plan.getId(), e.getMessage());
            }
        }

        log.info("[NutritionRiskScheduler] Done — {} plans updated", updated);
    }
}