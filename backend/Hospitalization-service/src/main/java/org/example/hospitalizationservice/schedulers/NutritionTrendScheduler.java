// NutritionTrendScheduler.java
package org.example.hospitalizationservice.schedulers;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.hospitalizationservice.entities.NutritionPlan;
import org.example.hospitalizationservice.repository.NutritionPlanRepository;
import org.example.hospitalizationservice.service.NutritionTrendService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class NutritionTrendScheduler {

    private final NutritionTrendService   trendService;
    private final NutritionPlanRepository nutritionPlanRepository;

    /**
     * Runs every day at 06:30 (30 min after risk, so risk is always computed first).
     * Recomputes the 7-day macro trend for every plan and persists it.
     */
    @Scheduled(cron = "0 30 6 * * *")
    public void refreshAllTrends() {
        List<NutritionPlan> plans = nutritionPlanRepository.findAll();
        log.info("[NutritionTrendScheduler] Running daily trend analysis for {} plans", plans.size());

        int updated = 0;
        for (NutritionPlan plan : plans) {
            try {
                trendService.getWeeklyTrendAndPersist(plan);
                updated++;
            } catch (Exception e) {
                log.error("[NutritionTrendScheduler] Failed to compute trend for plan id={}: {}", plan.getId(), e.getMessage());
            }
        }

        log.info("[NutritionTrendScheduler] Done — {} plans updated", updated);
    }
}