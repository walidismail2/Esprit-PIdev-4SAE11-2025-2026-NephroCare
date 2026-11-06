package org.example.hospitalizationservice.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.example.hospitalizationservice.entities.MealRecord;
import org.example.hospitalizationservice.entities.NutritionPlan;
import org.example.hospitalizationservice.entities.PatientNutritionProfile;
import org.example.hospitalizationservice.enums.DietType;
import org.example.hospitalizationservice.enums.NutritionRiskLevel;
import org.example.hospitalizationservice.repository.HospitalizationRepository;
import org.example.hospitalizationservice.repository.MealRecordRepository;
import org.example.hospitalizationservice.repository.NutritionPlanRepository;
import org.example.hospitalizationservice.repository.PatientNutritionProfileRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NutritionRiskService {

    private static final int    LOOKBACK_DAYS           = 7;
    private static final double COMPOSITE_LOW_THRESHOLD = 60.0;
    private static final double CRITICAL_AVG_COMPOSITE  = 35.0;
    private static final double HIGH_AVG_COMPOSITE      = 50.0;
    private static final double CRITICAL_PROTEIN_AVG    = 40.0;
    private static final double HIGH_PROTEIN_AVG        = 55.0;
    private static final double HIGH_VOLATILITY         = 25.0;

    private final NutritionPlanRepository           nutritionPlanRepository;
    private final PatientNutritionProfileRepository profileRepository;
    private final NutritionSummaryService           summaryService;
    private final MealRecordRepository              mealRecordRepository;
    private final HospitalizationRepository         hospitalizationRepository; // ← added

    // ═════════════════════════════════════════════════════════════════════════
    //  PUBLIC ENTRY POINT
    // ═════════════════════════════════════════════════════════════════════════

    @Transactional
    public Map<String, Object> assessAndPersist(NutritionPlan plan) {
        System.out.println(">>> assessAndPersist called, plan.id=" + plan.getId());
        try {
            LocalDate today     = LocalDate.now();
            LocalDate weekStart = today.minusDays(LOOKBACK_DAYS - 1);

            // ✅ Use shadow FK + projection instead of lazy proxy traversal.
            //    plan.getHospitalization().getUserId() would throw
            //    LazyInitializationException because the plan was loaded in the
            //    controller (outside this transaction) and the proxy is detached.
            PatientNutritionProfile profile = hospitalizationRepository
                    .findHospInfoById(plan.getHospitalizationId())
                    .map(h -> profileRepository.findByUserId(h.getUserId()).orElse(null))
                    .orElse(null);

            Map<String, Double> weights = resolveWeights(plan.getDietType());

            // ── ONE query for all 7 days of meals ─────────────────────────────────
            List<MealRecord> allMeals = mealRecordRepository.findByPlanIdAndDateRange(
                    plan.getId(),
                    weekStart.atStartOfDay(),
                    today.plusDays(1).atStartOfDay()
            );

            // Group by date in memory — no more per-day DB hits
            Map<LocalDate, List<MealRecord>> mealsByDay = allMeals.stream()
                    .collect(Collectors.groupingBy(m -> m.getRecordedAt().toLocalDate()));

            // ── Collect 7 days of achievement data ────────────────────────────────
            List<Double> compositePerDay = new ArrayList<>();
            Map<String, List<Double>> macroSeries = new LinkedHashMap<>();
            for (String k : List.of("calories", "protein", "carbs", "fat"))
                macroSeries.put(k, new ArrayList<>());

            for (int i = 0; i < LOOKBACK_DAYS; i++) {
                LocalDate        date     = today.minusDays(i);
                List<MealRecord> dayMeals = mealsByDay.getOrDefault(date, List.of());

                // Uses pre-fetched list — zero extra DB queries
                Map<String, Object> summary = summaryService.getDailySummaryFromMeals(plan, date, dayMeals);

                Map<String, Double> ach = Optional.ofNullable(
                        (Map<String, Double>) summary.get("achievementPct")
                ).orElse(Map.of());

                for (String macro : macroSeries.keySet())
                    macroSeries.get(macro).add(ach.getOrDefault(macro, 0.0));

                double carbComponent = plan.getDietType() == DietType.DIABETIC
                        ? Math.min(ach.getOrDefault("carbs", 0.0), 100.0)
                        : ach.getOrDefault("carbs", 0.0);

                double composite =
                        weights.get("calories") * ach.getOrDefault("calories", 0.0)
                                + weights.get("protein")  * ach.getOrDefault("protein",  0.0)
                                + weights.get("carbs")    * carbComponent
                                + weights.get("fat")      * ach.getOrDefault("fat",      0.0);

                compositePerDay.add(composite);
            }

            // ── Derived metrics ───────────────────────────────────────────────────
            double avgComposite = avg(compositePerDay);
            double volatility   = std(compositePerDay);

            int consecutiveLow = 0;
            for (double s : compositePerDay) {
                if (s < COMPOSITE_LOW_THRESHOLD) consecutiveLow++;
                else break;
            }

            Map<String, Double> macroAvgs = new LinkedHashMap<>();
            macroSeries.forEach((k, v) -> macroAvgs.put(k, Math.round(avg(v) * 10) / 10.0));

            // ── Risk determination + trigger generation ───────────────────────────
            List<String> triggers = new ArrayList<>();
            NutritionRiskLevel risk = determineRisk(
                    plan, profile, avgComposite, consecutiveLow,
                    volatility, macroAvgs, triggers);

            plan.setRiskLevel(risk);
            nutritionPlanRepository.save(plan);

            // ── Build response ────────────────────────────────────────────────────
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("riskLevel",                risk);
            result.put("consecutiveLowDays",       consecutiveLow);
            result.put("averageCompositeScore",    Math.round(avgComposite * 10) / 10.0);
            result.put("volatilityScore",          Math.round(volatility   * 10) / 10.0);
            result.put("macroAverageAchievements", macroAvgs);
            result.put("appliedWeights",           weights);
            result.put("triggers",                 triggers);
            return result;
        } catch (Exception e) {
            System.err.println(">>> EXCEPTION in assessAndPersist: " + e.getClass().getName() + ": " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  RISK DETERMINATION
    // ═════════════════════════════════════════════════════════════════════════

    private NutritionRiskLevel determineRisk(
            NutritionPlan plan,
            PatientNutritionProfile profile,
            double avgComposite, int consecutiveLow,
            double volatility, Map<String, Double> macroAvgs,
            List<String> triggers) {

        double avgProtein  = macroAvgs.get("protein");
        double avgCarbs    = macroAvgs.get("carbs");
        double avgCalories = macroAvgs.get("calories");

        // ── CRITICAL ──────────────────────────────────────────────────────────
        boolean isCritical = false;

        if (consecutiveLow >= 5) {
            triggers.add("5+ consecutive days with composite nutritional score below 60 %");
            isCritical = true;
        }
        if (avgComposite < CRITICAL_AVG_COMPOSITE) {
            triggers.add(String.format(
                    "Average composite nutritional score critically low (%.1f %%) over 7 days", avgComposite));
            isCritical = true;
        }
        if (avgProtein < CRITICAL_PROTEIN_AVG && plan.getDietType() != DietType.RENAL) {
            triggers.add(String.format(
                    "Protein intake severely deficient (avg %.1f %% of target) — "
                            + "high risk of muscle wasting and impaired wound healing", avgProtein));
            isCritical = true;
        }
        if (plan.getDietType() == DietType.RENAL && avgProtein > 140) {
            triggers.add(String.format(
                    "Protein intake far exceeds RENAL diet target (avg %.1f %%) — "
                            + "risk of accelerating CKD progression; dietitian review required", avgProtein));
            isCritical = true;
        }
        if (isCritical) return NutritionRiskLevel.CRITICAL;

        // ── HIGH ──────────────────────────────────────────────────────────────
        boolean isHigh = false;

        if (consecutiveLow >= 3) {
            triggers.add("3+ consecutive days of poor composite nutritional intake");
            isHigh = true;
        }
        if (avgComposite < HIGH_AVG_COMPOSITE) {
            triggers.add(String.format(
                    "Average composite score low (%.1f %%) — sustained nutritional deficit", avgComposite));
            isHigh = true;
        }
        if (avgProtein < HIGH_PROTEIN_AVG && plan.getDietType() != DietType.RENAL) {
            triggers.add(String.format(
                    "Protein achievement persistently below target (avg %.1f %%) — may delay recovery", avgProtein));
            isHigh = true;
        }
        if (plan.getDietType() == DietType.RENAL && avgProtein > 120) {
            triggers.add(String.format(
                    "Protein intake consistently above RENAL target (avg %.1f %%) — "
                            + "nephrologist review recommended", avgProtein));
            isHigh = true;
        }
        if (plan.getDietType() == DietType.DIABETIC && avgCarbs > 130) {
            triggers.add(String.format(
                    "Carbohydrate intake persistently above DIABETIC target (avg %.1f %%) — "
                            + "glycaemic control at risk; monitor blood glucose closely", avgCarbs));
            isHigh = true;
        }
        if (isHigh) return NutritionRiskLevel.HIGH;

        // ── MODERATE ──────────────────────────────────────────────────────────
        boolean isModerate = false;

        if (consecutiveLow >= 1) {
            triggers.add("Recent day(s) with nutritional composite below 60 % threshold");
            isModerate = true;
        }
        if (avgComposite < COMPOSITE_LOW_THRESHOLD) {
            triggers.add(String.format(
                    "Average composite score below 60 %% (%.1f %%) — intake insufficient", avgComposite));
            isModerate = true;
        }
        if (volatility > HIGH_VOLATILITY) {
            triggers.add(String.format(
                    "High intake volatility (σ = %.1f %%) — erratic eating pattern; "
                            + "consider dysphagia or appetite disorder screening", volatility));
            isModerate = true;
        }
        if (avgCalories < 70) {
            triggers.add("Caloric achievement below 70 % — consider calorie-dense oral supplements");
            isModerate = true;
        }
        if (plan.getDietType() == DietType.CARDIAC && macroAvgs.get("fat") > 110) {
            triggers.add(String.format(
                    "Fat intake trending above CARDIAC target (avg %.1f %%) — "
                            + "review meal fat sources", macroAvgs.get("fat")));
            isModerate = true;
        }
        if (isModerate) return NutritionRiskLevel.MODERATE;

        return NutritionRiskLevel.NORMAL;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  DIET-TYPE-AWARE MACRO WEIGHTS
    // ═════════════════════════════════════════════════════════════════════════

    private Map<String, Double> resolveWeights(DietType type) {
        return switch (type) {
            case DIABETIC     -> Map.of("calories", 0.30, "protein", 0.25, "carbs", 0.30, "fat", 0.15);
            case HIGH_PROTEIN,
                 LIQUID       -> Map.of("calories", 0.25, "protein", 0.50, "carbs", 0.15, "fat", 0.10);
            case RENAL        -> Map.of("calories", 0.30, "protein", 0.45, "carbs", 0.15, "fat", 0.10);
            case CARDIAC      -> Map.of("calories", 0.30, "protein", 0.30, "carbs", 0.20, "fat", 0.20);
            default           -> Map.of("calories", 0.35, "protein", 0.35, "carbs", 0.15, "fat", 0.15);
        };
    }

    // ── Math helpers ───────────────────────────────────────────────────────────

    private double avg(List<Double> values) {
        return values.stream().mapToDouble(Double::doubleValue).average().orElse(0);
    }

    private double std(List<Double> values) {
        double mean = avg(values);
        return Math.sqrt(values.stream()
                .mapToDouble(v -> Math.pow(v - mean, 2))
                .average().orElse(0));
    }
}