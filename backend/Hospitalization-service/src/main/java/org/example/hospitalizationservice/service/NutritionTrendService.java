package org.example.hospitalizationservice.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.example.hospitalizationservice.entities.MealRecord;
import org.example.hospitalizationservice.entities.NutritionPlan;
import org.example.hospitalizationservice.enums.DietType;
import org.example.hospitalizationservice.enums.NutritionTrend;
import org.example.hospitalizationservice.repository.MealRecordRepository;
import org.example.hospitalizationservice.repository.NutritionPlanRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NutritionTrendService {

    private static final double IMPROVING_SLOPE   =  1.5;
    private static final double DECLINING_SLOPE   = -1.5;
    private static final double CRITICAL_COMPOSITE = 40.0;

    private final NutritionSummaryService  summaryService;
    private final NutritionPlanRepository  nutritionPlanRepository;
    private final MealRecordRepository     mealRecordRepository;

    // ═════════════════════════════════════════════════════════════════════════
    //  PUBLIC ENTRY POINT
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Produces a clinically meaningful weekly trend report.
     *
     * Performance: ONE bulk meal query for all 7 days, grouped in memory.
     * Persistence: targeted UPDATE via @Modifying — no merge-SELECT.
     */
    @Transactional
    public Map<String, Object> getWeeklyTrendAndPersist(NutritionPlan plan) {
        LocalDate today     = LocalDate.now();
        LocalDate weekStart = today.minusDays(6);

        Map<String, Double> weights = resolveWeights(plan.getDietType());

        // ── ONE bulk query — no per-day DB hits ───────────────────────────────
        List<MealRecord> allMeals = mealRecordRepository.findByPlanIdAndDateRange(
                plan.getId(),
                weekStart.atStartOfDay(),
                today.plusDays(1).atStartOfDay()
        );

        Map<LocalDate, List<MealRecord>> mealsByDay = allMeals.stream()
                .collect(Collectors.groupingBy(m -> m.getRecordedAt().toLocalDate()));

        // ── Collect 7 days (oldest → newest) ─────────────────────────────────
        List<Map<String, Object>> points       = new ArrayList<>();
        List<Double> calSeries     = new ArrayList<>(), proSeries = new ArrayList<>(),
                carSeries     = new ArrayList<>(), fatSeries = new ArrayList<>(),
                weightedSeries = new ArrayList<>();

        for (int i = 6; i >= 0; i--) {
            LocalDate        date     = today.minusDays(i);
            List<MealRecord> dayMeals = mealsByDay.getOrDefault(date, List.of());

            Map<String, Object> summary = summaryService.getDailySummaryFromMeals(plan, date, dayMeals);

            @SuppressWarnings("unchecked")
            Map<String, Double>  ach      = (Map<String, Double>)  summary.get("achievementPct");
            @SuppressWarnings("unchecked")
            Map<String, Integer> consumed = (Map<String, Integer>) summary.get("consumed");

            double cal = ach.getOrDefault("calories", 0.0);
            double pro = ach.getOrDefault("protein",  0.0);
            double car = ach.getOrDefault("carbs",    0.0);
            double fat = ach.getOrDefault("fat",      0.0);

            calSeries.add(cal); proSeries.add(pro);
            carSeries.add(car); fatSeries.add(fat);

            // DIABETIC: cap carb credit at 100 % — over-target is not a positive
            double carbComponent = plan.getDietType() == DietType.DIABETIC
                    ? Math.min(car, 100.0) : car;

            double composite =
                    weights.get("calories") * cal
                            + weights.get("protein")  * pro
                            + weights.get("carbs")    * carbComponent
                            + weights.get("fat")      * fat;
            weightedSeries.add(composite);

            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date",               date.toString());
            point.put("calories",           consumed.get("calories"));
            point.put("proteinG",           consumed.get("proteinG"));
            point.put("carbsG",             consumed.get("carbsG"));
            point.put("fatG",               consumed.get("fatG"));
            point.put("calorieAchievement", round1(cal));
            point.put("proteinAchievement", round1(pro));
            point.put("carbAchievement",    round1(car));
            point.put("fatAchievement",     round1(fat));
            point.put("weightedComposite",  round1(composite));
            points.add(point);
        }

        // ── Per-macro trend via linear regression ─────────────────────────────
        double calSlope  = linearSlope(calSeries);
        double proSlope  = linearSlope(proSeries);
        double carSlope  = linearSlope(carSeries);
        double fatSlope  = linearSlope(fatSeries);
        double compSlope = linearSlope(weightedSeries);

        Map<String, Object> macroTrends = new LinkedHashMap<>();
        macroTrends.put("calories", buildMacroTrend(calSlope, avg(calSeries)));
        macroTrends.put("protein",  buildMacroTrend(proSlope, avg(proSeries)));
        macroTrends.put("carbs",    buildMacroTrend(carSlope, avg(carSeries)));
        macroTrends.put("fat",      buildMacroTrend(fatSlope, avg(fatSeries)));

        NutritionTrend overallTrend = trendFromSlope(compSlope);

        // ── Pattern detection ─────────────────────────────────────────────────
        List<String> patterns = detectPatterns(
                plan.getDietType(),
                calSeries, proSeries, carSeries, fatSeries,
                weightedSeries,
                calSlope, proSlope, carSlope);

        // ── Predictive flag ───────────────────────────────────────────────────
        Integer daysUntilCritical = null;
        if (overallTrend == NutritionTrend.DECLINING)
            daysUntilCritical = estimateDaysUntilCritical(weightedSeries, compSlope);

        // ── Persist — single UPDATE, no prior SELECT ──────────────────────────
        nutritionPlanRepository.updateTrend(plan.getId(), overallTrend);

        // ── Build response ────────────────────────────────────────────────────
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("overallTrend",   overallTrend);
        result.put("overallSlope",   round2(compSlope));
        result.put("macroTrends",    macroTrends);
        result.put("points",         points);
        result.put("patterns",       patterns);
        result.put("appliedWeights", weights);
        if (daysUntilCritical != null)
            result.put("estimatedDaysUntilCritical", daysUntilCritical);

        return result;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  LINEAR REGRESSION SLOPE  (least-squares, % per day)
    // ═════════════════════════════════════════════════════════════════════════

    private double linearSlope(List<Double> values) {
        int n = values.size();
        if (n < 2) return 0;
        double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (int i = 0; i < n; i++) {
            sumX  += i;
            sumY  += values.get(i);
            sumXY += (double) i * values.get(i);
            sumX2 += (double) i * i;
        }
        double denom = n * sumX2 - sumX * sumX;
        return denom == 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    }

    private NutritionTrend trendFromSlope(double slope) {
        if      (slope >  IMPROVING_SLOPE) return NutritionTrend.IMPROVING;
        else if (slope <  DECLINING_SLOPE) return NutritionTrend.DECLINING;
        else                               return NutritionTrend.STABLE;
    }

    private Map<String, Object> buildMacroTrend(double slope, double weekAvg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("trend",   trendFromSlope(slope));
        m.put("slope",   round2(slope));
        m.put("weekAvg", round1(weekAvg));
        return m;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  PATTERN DETECTION
    // ═════════════════════════════════════════════════════════════════════════

    private List<String> detectPatterns(
            DietType type,
            List<Double> cal, List<Double> pro, List<Double> car, List<Double> fat,
            List<Double> composite,
            double calSlope, double proSlope, double carSlope) {

        List<String> patterns = new ArrayList<>();

        double avgCal  = avg(cal),  avgPro = avg(pro),
                avgCar  = avg(car),  avgFat = avg(fat),
                avgComp = avg(composite);
        double calStd  = std(cal),  proStd = std(pro);

        if (avgPro < 60 && type != DietType.RENAL)
            patterns.add(String.format(
                    "Protein consistently underachieved (weekly avg %.1f %%) — "
                            + "review protein-rich meal options or consider oral protein supplements", avgPro));

        if (type == DietType.RENAL && avgPro > 110)
            patterns.add(String.format(
                    "Protein consistently above RENAL target (weekly avg %.1f %%) — "
                            + "dietary counselling required to prevent accelerated kidney decline", avgPro));

        if (type == DietType.DIABETIC && avgCar > 115)
            patterns.add(String.format(
                    "Carbohydrate intake persistently above DIABETIC ceiling (avg %.1f %%) — "
                            + "recommend low-GI substitutions and blood glucose monitoring", avgCar));

        if (type == DietType.DIABETIC && avgCar < 70)
            patterns.add(String.format(
                    "Carbohydrate intake significantly below DIABETIC target (avg %.1f %%) — "
                            + "risk of hypoglycaemia; review anti-diabetic medication dosing", avgCar));

        if (avgCal > 85 && avgPro < 65 && type != DietType.RENAL)
            patterns.add("Adequate caloric intake but poor protein distribution — "
                    + "patient appears to favour carbohydrate-rich foods; meal composition review required");

        if (calSlope > IMPROVING_SLOPE && proSlope < DECLINING_SLOPE)
            patterns.add("Caloric intake improving but protein declining — "
                    + "patient may be increasing carbohydrate-heavy snacks while avoiding protein-rich meals");

        if (proSlope > IMPROVING_SLOPE && calSlope < DECLINING_SLOPE)
            patterns.add("Protein intake improving but overall calories falling — "
                    + "consider adding calorie-dense healthy fats (e.g. avocado, nut butters)");

        if (calStd > 30)
            patterns.add(String.format(
                    "Highly erratic daily caloric intake (σ = %.1f %%) — "
                            + "consider appetite stimulant assessment or swallowing evaluation", calStd));

        if (type == DietType.CARDIAC && avgFat > 115)
            patterns.add(String.format(
                    "Fat intake trending above CARDIAC limit (weekly avg %.1f %%) — "
                            + "review cooking methods and portion sizes of high-fat foods", avgFat));

        if (avgComp > 85 && linearSlope(composite) >= 0)
            patterns.add("All nutritional targets consistently met — patient nutritional status stable or improving");
        else if (patterns.isEmpty() && avgComp >= 70)
            patterns.add("Nutritional intake within acceptable range; no specific concerns detected this week");

        return patterns;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  PREDICTIVE FLAG
    // ═════════════════════════════════════════════════════════════════════════

    private Integer estimateDaysUntilCritical(List<Double> scores, double slope) {
        double current = avg(scores);
        if (slope >= 0 || current <= CRITICAL_COMPOSITE) return null;
        int days = (int) Math.ceil((current - CRITICAL_COMPOSITE) / Math.abs(slope));
        return Math.max(days, 1);
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

    // ── Math helpers ──────────────────────────────────────────────────────────

    private double avg(List<Double> v) {
        return v.stream().mapToDouble(Double::doubleValue).average().orElse(0);
    }

    private double std(List<Double> v) {
        double mean = avg(v);
        return Math.sqrt(v.stream().mapToDouble(x -> Math.pow(x - mean, 2)).average().orElse(0));
    }

    private double round1(double v) { return Math.round(v * 10)  / 10.0; }
    private double round2(double v) { return Math.round(v * 100) / 100.0; }
}