package org.example.hospitalizationservice.service;

import lombok.RequiredArgsConstructor;
import org.example.hospitalizationservice.entities.Hospitalization;
import org.example.hospitalizationservice.entities.NutritionPlan;
import org.example.hospitalizationservice.entities.PatientNutritionProfile;
import org.example.hospitalizationservice.enums.ActivityLevel;
import org.example.hospitalizationservice.enums.DietType;
import org.example.hospitalizationservice.enums.Gender;
import org.example.hospitalizationservice.repository.PatientNutritionProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DietSuggestionService {

    private final PatientNutritionProfileRepository profileRepository;

    // ── Keyword → diet type (admission reason fallback) ───────────────
    private static final Map<String, DietType> KEYWORD_MAP = new LinkedHashMap<>() {{
        put("renal",        DietType.RENAL);
        put("kidney",       DietType.RENAL);
        put("cardiac",      DietType.CARDIAC);
        put("heart",        DietType.CARDIAC);
        put("hypertension", DietType.LOW_SODIUM);
        put("diabetes",     DietType.DIABETIC);
        put("diabetic",     DietType.DIABETIC);
        put("surgery",      DietType.LIQUID);
        put("post-op",      DietType.LIQUID);
        put("protein",      DietType.HIGH_PROTEIN);
        put("vegetarian",   DietType.VEGETARIAN);
    }};

    // ═══════════════════════════════════════════════════════════════════
    //  PUBLIC ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════

    public NutritionPlan buildDefaultPlan(Hospitalization hosp) {
        PatientNutritionProfile profile = profileRepository
                .findByUserId(hosp.getUserId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No nutrition profile found for patient. Please create one before generating a plan."));

        DietType dietType = resolveDietType(hosp, profile);

        NutritionPlan plan = new NutritionPlan();
        plan.setHospitalization(hosp);
        plan.setDietType(dietType);
        plan.setCreatedAt(LocalDateTime.now());

        applyPreciseMacros(plan, profile, dietType);
        return plan;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  STEP 1 — DIET TYPE RESOLUTION
    //  Priority: CKD stage > profile comorbidities > admission keyword
    // ═══════════════════════════════════════════════════════════════════

    private DietType resolveDietType(Hospitalization hosp, PatientNutritionProfile p) {

        // CKD stage 3–5 always forces RENAL regardless of other conditions
        if (p.getCkdStage() >= 3)
            return DietType.RENAL;

        // Profile comorbidities override admission keyword
        if (p.isDiabetic() && p.isHypertensive())
            return DietType.DIABETIC;   // diabetic takes priority; sodium is handled in macros
        if (p.isDiabetic())
            return DietType.DIABETIC;
        if (p.isHypertensive())
            return DietType.LOW_SODIUM;

        // Fall back to keyword matching on admission reason
        String reason = hosp.getAdmissionReason().toLowerCase();
        return KEYWORD_MAP.entrySet().stream()
                .filter(e -> reason.contains(e.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(DietType.STANDARD);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  STEP 2 — CALORIE CALCULATION
    //
    //  Formula: Mifflin-St Jeor BMR  ×  activity factor  ×  stress factor
    //
    //  Mifflin-St Jeor:
    //    Male   → (10 × kg) + (6.25 × cm) − (5 × age) + 5
    //    Female → (10 × kg) + (6.25 × cm) − (5 × age) − 161
    //
    //  Activity factors (standard TDEE multipliers):
    //    SEDENTARY          → 1.20
    //    LIGHTLY_ACTIVE     → 1.375
    //    MODERATELY_ACTIVE  → 1.55
    //    VERY_ACTIVE        → 1.725
    //    EXTRA_ACTIVE       → 1.90
    //
    //  Clinical stress / condition adjustments applied after TDEE:
    //    CKD 3–4   → −10 %  (reduced metabolic demand, avoid over-feeding)
    //    CKD 5     → −15 %
    //    Diabetic  → −10 %  (calorie restriction improves glycaemic control)
    //    Cardiac   → −10 %  (reduce cardiac workload)
    //    Liquid    → −35 %  (post-surgical / clear liquid phase)
    //    Obese BMI ≥ 30 → additional −10 %
    // ═══════════════════════════════════════════════════════════════════

    private int calculateTargetCalories(PatientNutritionProfile p, DietType type) {

        // ── BMR (Mifflin-St Jeor) ─────────────────────────────────────
        double bmr;
        if (p.getGender() == Gender.MALE) {
            bmr = (10.0 * p.getWeightKg())
                    + (6.25 * p.getHeightCm())
                    - (5.0  * p.getAge())
                    + 5.0;
        } else {
            bmr = (10.0 * p.getWeightKg())
                    + (6.25 * p.getHeightCm())
                    - (5.0  * p.getAge())
                    - 161.0;
        }

        // ── Activity multiplier ───────────────────────────────────────
        double activityFactor = switch (p.getActivityLevel()) {
            case SEDENTARY         -> 1.20;
            case LIGHTLY_ACTIVE    -> 1.375;
            case MODERATELY_ACTIVE -> 1.55;
            case VERY_ACTIVE       -> 1.725;
            case EXTRA_ACTIVE      -> 1.90;
        };

        double tdee = bmr * activityFactor;

        // ── Clinical stress adjustments ───────────────────────────────
        double stressFactor = 1.0;

        if (p.getCkdStage() == 5)       stressFactor -= 0.15;
        else if (p.getCkdStage() >= 3)  stressFactor -= 0.10;

        if (type == DietType.DIABETIC)  stressFactor -= 0.10;
        if (type == DietType.CARDIAC)   stressFactor -= 0.10;
        if (type == DietType.LIQUID)    stressFactor -= 0.35;

        // Obesity penalty
        if (p.getBmi() >= 30.0)         stressFactor -= 0.10;

        // Floor: never drop below 1 000 kcal (clinical safety minimum)
        int calories = (int) Math.round(tdee * stressFactor);
        return Math.max(calories, 1000);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  STEP 3 — PROTEIN CALCULATION  (g/day)
    //
    //  Baseline per kg of body weight:
    //    Healthy / standard     → 0.8  g/kg   (WHO RDA)
    //    High-protein / surgery → 1.5  g/kg
    //    Cardiac                → 1.0  g/kg
    //    Diabetic               → 0.9  g/kg   (modest restriction)
    //
    //  CKD override (GFR-driven protein restriction — KDOQI guidelines):
    //    GFR ≥ 60  (CKD 1–2)  → 0.8  g/kg
    //    GFR 30–59 (CKD 3)    → 0.6  g/kg
    //    GFR 15–29 (CKD 4)    → 0.5  g/kg
    //    GFR < 15  (CKD 5)    → 0.4  g/kg   (pre-dialysis conservative)
    //
    //  Protein kcal = protein_g × 4 kcal/g
    //  Protein must not exceed 35 % of total calories (upper safety cap).
    // ═══════════════════════════════════════════════════════════════════

    private int calculateProteinG(PatientNutritionProfile p, DietType type, int targetCalories) {

        double gPerKg;

        // CKD protein restriction takes absolute priority
        if (p.getCkdStage() >= 3) {
            if      (p.getGfr() < 15)  gPerKg = 0.4;
            else if (p.getGfr() < 30)  gPerKg = 0.5;
            else                        gPerKg = 0.6;
        } else {
            gPerKg = switch (type) {
                case HIGH_PROTEIN -> 1.5;
                case LIQUID       -> 1.2;   // preserve lean mass post-surgery
                case CARDIAC      -> 1.0;
                case DIABETIC     -> 0.9;
                default           -> 0.8;
            };
        }

        double proteinG = gPerKg * p.getWeightKg();

        // Safety cap: protein ≤ 35 % of total calories
        double maxProteinG = (targetCalories * 0.35) / 4.0;
        return (int) Math.round(Math.min(proteinG, maxProteinG));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  STEP 4 — CARBOHYDRATE CALCULATION  (g/day)
    //
    //  Carbs fill remaining calories after protein + fat are assigned.
    //  Target carb % of total calories by diet type:
    //    DIABETIC   → 40 %  (low-carb glycaemic control)
    //    RENAL      → 55 %  (higher carbs compensate for protein limit)
    //    CARDIAC    → 50 %
    //    LOW_SODIUM → 50 %
    //    LIQUID     → 60 %  (mostly carb-based clear liquids)
    //    default    → 50 %
    //
    //  Carbs are floored at 100 g/day (minimum to avoid ketosis in
    //  non-ketogenic clinical settings).
    //  1 g carb = 4 kcal
    // ═══════════════════════════════════════════════════════════════════

    private int calculateCarbsG(PatientNutritionProfile p, DietType type,
                                int targetCalories, int proteinG) {

        double carbPct = switch (type) {
            case DIABETIC   -> 0.40;
            case RENAL      -> 0.55;
            case CARDIAC    -> 0.50;
            case LOW_SODIUM -> 0.50;
            case LIQUID     -> 0.60;
            default         -> 0.50;
        };

        // Diabetic patients who are also hypertensive get a tighter cap
        if (type == DietType.DIABETIC && p.isHypertensive())
            carbPct = 0.35;

        double carbsG = (targetCalories * carbPct) / 4.0;
        return (int) Math.max(Math.round(carbsG), 100);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  STEP 5 — FAT CALCULATION  (g/day)
    //
    //  Fat fills the remaining calorie gap:
    //    fatG = (totalCalories − proteinKcal − carbKcal) / 9
    //
    //  Then clamped by clinical limits:
    //    Cardiac / hypertensive → cap at 50 g/day  (heart-healthy limit)
    //    CKD                    → cap at 70 g/day
    //    Floor                  → 20 g/day (essential fatty acids minimum)
    //  1 g fat = 9 kcal
    // ═══════════════════════════════════════════════════════════════════

    private int calculateFatG(PatientNutritionProfile p, DietType type,
                              int targetCalories, int proteinG, int carbsG) {

        double remainingKcal = targetCalories
                - (proteinG * 4.0)
                - (carbsG   * 4.0);

        double fatG = remainingKcal / 9.0;

        // Apply clinical fat caps
        if (type == DietType.CARDIAC || p.isHypertensive())
            fatG = Math.min(fatG, 50.0);
        else if (p.getCkdStage() >= 3)
            fatG = Math.min(fatG, 70.0);

        // Absolute floor: essential fatty acid minimum
        return (int) Math.max(Math.round(fatG), 20);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ORCHESTRATOR — wires steps 2–5 together and sets plan fields
    // ═══════════════════════════════════════════════════════════════════

    private void applyPreciseMacros(NutritionPlan plan,
                                    PatientNutritionProfile profile,
                                    DietType type) {

        int calories = calculateTargetCalories(profile, type);
        int protein  = calculateProteinG(profile, type, calories);
        int carbs    = calculateCarbsG(profile, type, calories, protein);
        int fat      = calculateFatG(profile, type, calories, protein, carbs);

        plan.setTargetCalories(calories);
        plan.setTargetProteinG(protein);
        plan.setTargetCarbsG(carbs);
        plan.setTargetFatG(fat);

        // Auto-generate a readable clinical note summarising the logic
        plan.setNotes(buildNotes(profile, type, calories, protein, carbs, fat));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  NOTE BUILDER — transparent reasoning saved on the plan
    // ═══════════════════════════════════════════════════════════════════

    private String buildNotes(PatientNutritionProfile p, DietType type,
                              int cal, int pro, int carb, int fat) {

        return String.format(
                "Auto-generated plan — %s diet | " +
                        "BMI: %.1f | CKD stage: %d | GFR: %.1f | " +
                        "Diabetic: %s | Hypertensive: %s | " +
                        "Activity: %s | " +
                        "Targets: %d kcal | %dg protein | %dg carbs | %dg fat",
                type.name(),
                p.getBmi(),
                p.getCkdStage(),
                p.getGfr(),
                p.isDiabetic()     ? "yes" : "no",
                p.isHypertensive() ? "yes" : "no",
                p.getActivityLevel().name(),
                cal, pro, carb, fat
        );
    }
}