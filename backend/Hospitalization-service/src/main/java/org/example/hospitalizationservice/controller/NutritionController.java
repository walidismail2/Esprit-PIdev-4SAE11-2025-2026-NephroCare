package org.example.hospitalizationservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.hospitalizationservice.entities.MealRecord;
import org.example.hospitalizationservice.entities.NutritionPlan;
import org.example.hospitalizationservice.repository.HospitalizationRepository;
import org.example.hospitalizationservice.repository.MealRecordRepository;
import org.example.hospitalizationservice.repository.NutritionPlanRepository;
import org.example.hospitalizationservice.service.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/nutrition")
@RequiredArgsConstructor
public class NutritionController {

    private final DietSuggestionService     dietSuggestionService;
    private final NutritionSummaryService   summaryService;
    private final NutritionRiskService      riskService;
    private final NutritionTrendService     trendService;
    private final NutritionPlanRepository   planRepository;
    private final MealRecordRepository      mealRecordRepository;
    private final HospitalizationRepository hospitalizationRepository;
    // ✅ EntityManager removed — detach() was called outside a transaction,
    //    causing IllegalArgumentException → 500 → gateway 503.
    //    The shadow FK is now set manually after save() instead.

    // ── Lightweight hospitalization info for the nutrition module ────────
    // ✅ Uses JPQL projection — no entity loaded, no Room JOIN, no @OneToOne probe.
    //    Old: findById() → loaded full Hospitalization + EAGER Room JOIN (query 1)
    //                    → Hibernate probed @OneToOne nutritionPlan (query 4)
    //    New: findHospInfoById() → SELECT 4 columns only, 1 query total.
    @GetMapping("/hosp-info/{hospitalizationId}")
    public ResponseEntity<Map<String, Object>> hospInfo(@PathVariable Long hospitalizationId) {
        return hospitalizationRepository.findHospInfoById(hospitalizationId)
                .map(h -> ResponseEntity.ok(Map.<String, Object>of(
                        "id",              h.getId(),
                        "userId",          h.getUserId(),
                        "admissionReason", h.getAdmissionReason(),
                        "status",          h.getStatus()
                )))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    // ── Feature 1 ── suggest + create plan ──────────────────────────────
    @PostMapping("/plan/suggest/{hospitalizationId}")
    public ResponseEntity<NutritionPlan> suggestAndCreate(@PathVariable Long hospitalizationId) {
        if (planRepository.existsByHospitalizationId(hospitalizationId))
            return ResponseEntity.status(HttpStatus.CONFLICT).build();

        var hosp = hospitalizationRepository.findById(hospitalizationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Hospitalization not found"));

        NutritionPlan plan  = dietSuggestionService.buildDefaultPlan(hosp);
        NutritionPlan saved = planRepository.save(plan);

        // ✅ Shadow FK is insertable=false/updatable=false so Hibernate never
        //    back-fills it from the INSERT result — set it explicitly so the
        //    response JSON includes hospitalizationId.
        //    @JsonBackReference on the hospitalization field already suppresses
        //    the full entity from serialization — no lazy-init risk.
        saved.setHospitalizationId(hospitalizationId);

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/plan/suggest/{hospitalizationId}")
    public ResponseEntity<NutritionPlan> reCalculatePlan(@PathVariable Long hospitalizationId) {
        var hosp = hospitalizationRepository.findById(hospitalizationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Hospitalization not found"));

        NutritionPlan plan = dietSuggestionService.buildDefaultPlan(hosp);

        // Overwrite existing plan if present, else insert fresh
        planRepository.findByHospitalizationId(hospitalizationId).ifPresent(existing -> {
            plan.setId(existing.getId());
            plan.setCreatedAt(existing.getCreatedAt()); // preserve original creation date
        });

        NutritionPlan saved = planRepository.save(plan);
        saved.setHospitalizationId(hospitalizationId);
        return ResponseEntity.ok(saved);
    }

    // ── GET plan by hospitalization id ───────────────────────────────────
    @GetMapping("/plan/{hospitalizationId}")
    public ResponseEntity<NutritionPlan> getPlan(@PathVariable Long hospitalizationId) {
        return planRepository.findByHospitalizationId(hospitalizationId)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No plan for this hospitalization"));
    }

    // ── UPDATE plan (by plan id) ──────────────────────────────────────────
    @PutMapping("/plan/{id}")
    public ResponseEntity<NutritionPlan> updatePlan(
            @PathVariable Long id,
            @RequestBody @Valid NutritionPlan body) {

        NutritionPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        plan.setDietType(body.getDietType());
        plan.setTargetCalories(body.getTargetCalories());
        plan.setTargetProteinG(body.getTargetProteinG());
        plan.setTargetCarbsG(body.getTargetCarbsG());
        plan.setTargetFatG(body.getTargetFatG());
        plan.setNotes(body.getNotes());
        plan.setPrescribedBy(body.getPrescribedBy());
        return ResponseEntity.ok(planRepository.save(plan));
    }

    // ── Feature 2 ── daily summary ────────────────────────────────────────
    @GetMapping("/plan/{id}/summary")
    public ResponseEntity<Map<String, Object>> dailySummary(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        NutritionPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return ResponseEntity.ok(summaryService.getDailySummary(plan, date != null ? date : LocalDate.now()));
    }

    // ── Feature 3 ── risk assessment ──────────────────────────────────────
    @GetMapping("/plan/{id}/risk")
    public ResponseEntity<Map<String, Object>> riskAssessment(@PathVariable Long id) {
        NutritionPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return ResponseEntity.ok(riskService.assessAndPersist(plan));
    }

    // ── Feature 4 ── weekly trend ─────────────────────────────────────────
    @GetMapping("/plan/{id}/trend")
    public ResponseEntity<Map<String, Object>> weeklyTrend(@PathVariable Long id) {
        NutritionPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return ResponseEntity.ok(trendService.getWeeklyTrendAndPersist(plan));
    }

    // ── Meal CRUD ─────────────────────────────────────────────────────────
    @PostMapping("/plan/{id}/meals")
    public ResponseEntity<MealRecord> addMeal(
            @PathVariable Long id,
            @RequestBody @Valid MealRecord meal) {
        NutritionPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        meal.setNutritionPlan(plan);
        if (meal.getRecordedAt() == null) meal.setRecordedAt(java.time.LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(mealRecordRepository.save(meal));
    }

    @GetMapping("/plan/{id}/meals")
    public ResponseEntity<List<MealRecord>> getMeals(@PathVariable Long id) {
        NutritionPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return ResponseEntity.ok(mealRecordRepository.findByNutritionPlanOrderByRecordedAtDesc(plan));
    }

    @DeleteMapping("/meals/{mealId}")
    public ResponseEntity<Void> deleteMeal(@PathVariable Long mealId) {
        mealRecordRepository.deleteById(mealId);
        return ResponseEntity.noContent().build();
    }
}