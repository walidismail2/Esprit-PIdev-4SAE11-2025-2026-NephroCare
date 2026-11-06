package org.example.hospitalizationservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.hospitalizationservice.entities.PatientNutritionProfile;
import org.example.hospitalizationservice.service.PatientNutritionProfileService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/nutrition/profiles")
@RequiredArgsConstructor
public class PatientNutritionProfileController {

    private final PatientNutritionProfileService profileService;

    // ── POST /api/nutrition/profiles ─────────────────────────────────
    @PostMapping
    public ResponseEntity<PatientNutritionProfile> create(
            @RequestBody @Valid PatientNutritionProfile profile) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(profileService.create(profile));
    }

    // ── GET /api/nutrition/profiles ──────────────────────────────────
    @GetMapping
    public ResponseEntity<List<PatientNutritionProfile>> getAll() {
        return ResponseEntity.ok(profileService.getAll());
    }

    // ── GET /api/nutrition/profiles/{id} ─────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<PatientNutritionProfile> getById(@PathVariable Long id) {
        return ResponseEntity.ok(profileService.getById(id));
    }

    // ── GET /api/nutrition/profiles/user/{userId} ─────────────────────
    // Used internally by DietSuggestionService to look up the profile
    // when building a plan from a hospitalization (joins on userId).
    @GetMapping("/user/{userId}")
    public ResponseEntity<PatientNutritionProfile> getByUserId(@PathVariable String userId) {
        return ResponseEntity.ok(profileService.getByUserId(userId));
    }

    // ── PUT /api/nutrition/profiles/{id} ─────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<PatientNutritionProfile> update(
            @PathVariable Long id,
            @RequestBody @Valid PatientNutritionProfile body) {
        return ResponseEntity.ok(profileService.update(id, body));
    }

    // ── DELETE /api/nutrition/profiles/{id} ──────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        profileService.delete(id);
        return ResponseEntity.noContent().build();
    }
}