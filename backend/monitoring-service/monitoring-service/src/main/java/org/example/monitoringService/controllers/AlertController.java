package org.example.monitoringService.controllers;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.monitoringService.dto.AlertCreateDTO;
import org.example.monitoringService.dto.AlertResponseDTO;
import org.example.monitoringService.dto.AlertUpdateDTO;
import org.example.monitoringService.dto.DiagnosticResultDTO;
import org.example.monitoringService.entities.enums.Severity;
import org.example.monitoringService.services.AlertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    @Autowired
    private AlertService service;



    // ─────────────────────────────────────────
    // CRUD
    // ─────────────────────────────────────────

    /**
     * Récupère toutes les alertes..
     */
    @GetMapping
    public List<AlertResponseDTO> getAll() {
        return service.getAll();
    }

    /**
     * Récupère une alerte par son ID.
     */
    @GetMapping("/{id}")
    public AlertResponseDTO getById(@PathVariable String id) {
        return service.getById(id);
    }

    /**
     * Crée une alerte manuellement.
     * @Valid déclenche la validation du DTO.
     */
    @PostMapping
    public AlertResponseDTO create(@Valid @RequestBody AlertCreateDTO dto) {
        return service.create(dto);
    }

    /**
     * Met à jour une alerte existante.
     */
    @PutMapping("/{id}")
    public AlertResponseDTO update(
            @PathVariable String id,
            @Valid @RequestBody AlertUpdateDTO dto) {
        return service.update(id, dto);
    }

    /**
     * Supprime une alerte.
     */
    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) {
        service.delete(id);
    }

    // ─────────────────────────────────────────
    // FEATURE 1 : Alertes actives
    // ─────────────────────────────────────────

    @GetMapping("/active")
    public List<AlertResponseDTO> getActive() {
        return service.getActive();
    }
    @GetMapping("/critical")
    public ResponseEntity<List<AlertResponseDTO>> getCritical() {
        return ResponseEntity.ok(service.getCriticalActive());
    }

    // ─────────────────────────────────────────
    // FEATURE 2 : Filtrage par sévérité
    // ─────────────────────────────────────────

    @GetMapping("/severity/{level}")
    public List<AlertResponseDTO> getBySeverity(@PathVariable String level) {
        return service.getBySeverity(level);
    }

    // ─────────────────────────────────────────
    // FEATURE 3 : Résolution d'alerte
    // ─────────────────────────────────────────

    @PatchMapping("/{id}/resolve")
    public AlertResponseDTO resolve(@PathVariable String id,@RequestParam String handledBy) {
        return service.resolve(id, handledBy);
    }

    // ─────────────────────────────────────────
    // FEATURE 4 : Génération depuis diagnostic
    // ─────────────────────────────────────────

    @PostMapping("/from-diagnostic")
    public AlertResponseDTO fromDiagnostic(@Valid @RequestBody DiagnosticResultDTO dto) {
        return service.generateFromDiagnostic(dto);
    }

    // ─────────────────────────────────────────
    // FEATURE 5 : Alertes critiques d'un patient
    // ─────────────────────────────────────────

    @GetMapping("/patient/{patientMatricule}/critical")
    public ResponseEntity<List<AlertResponseDTO>> getCriticalForPatient(@PathVariable String patientMatricule) {
        return ResponseEntity.ok(service.getCriticalAlertsForPatient(patientMatricule));
    }

    // ─────────────────────────────────────────
    // FEATURE 6 : Tableau de bord — CRITICAL des 24 dernières heures
    // ─────────────────────────────────────────

    @GetMapping("/dashboard/recent-critical")
    public ResponseEntity<List<AlertResponseDTO>> getRecentCritical() {
        return ResponseEntity.ok(service.getRecentCritical());
    }

    // ─────────────────────────────────────────
    // FEATURE 7 : Statistiques par patient
    // ─────────────────────────────────────────

    @GetMapping("/patient/{patientMatricule}/stats")
    public ResponseEntity<Map<String, Long>> getPatientStats(@PathVariable String patientMatricule) {
        return ResponseEntity.ok(service.getAlertStatsByPatient(patientMatricule));
    }

    @GetMapping("/patient/{patientMatricule}/risk-score")
    public ResponseEntity<Integer> getRiskScore(@PathVariable String patientMatricule){
        return ResponseEntity.ok(service.computeKidneyRiskScore(patientMatricule));
    }
    @GetMapping("/dashboard/analytics")
    public ResponseEntity<Map<String,Object>> getAnalytics(){
        return ResponseEntity.ok(service.getDashboardAnalytics());
    }
}