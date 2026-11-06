package org.example.monitoringService.controllers;


import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.monitoringService.dto.*;
import org.example.monitoringService.entities.Appointment;
import org.example.monitoringService.entities.enums.AppointmentStatus;
import org.example.monitoringService.services.AppointmentService;
import org.example.monitoringService.repositories.AppointmentRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class AppointmentController {

    private final AppointmentService service;
    private final AppointmentRepository appointmentRepository;

    @PostMapping("/addAppointment")
    public Appointment addAppointment(@RequestBody Appointment appointment) {

        appointment.setStatus(AppointmentStatus.SCHEDULED);

        return appointmentRepository.save(appointment);
    }

    // ── CRUD ──────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<AppointmentResponse> create(
            @Valid @RequestBody AppointmentRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> findAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> findById(@PathVariable String id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppointmentResponse> update(
            @PathVariable String id,
            @Valid @RequestBody AppointmentRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── F1 : Conflits ─────────────────────────────────────────────

    @PostMapping("/check-conflicts")
    public ResponseEntity<ConflictResponse> checkConflicts(
            @Valid @RequestBody ConflictCheckRequest req) {
        return ResponseEntity.ok(service.checkConflicts(req));
    }

    // ── F2 : Historique patient ───────────────────────────────────

    @GetMapping("/patient/{matricule}/history")
    public ResponseEntity<List<AppointmentHistoryDTO>> getHistory(
            @PathVariable String matricule) {
        return ResponseEntity.ok(service.getPatientHistory(matricule));
    }

    // ── F3 : Statistiques ────────────────────────────────────────

    @GetMapping("/stats")
    public ResponseEntity<List<AppointmentStatsDTO>> getStats(
            @RequestParam(required = false) String medecinId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(service.getStats(medecinId, from, to));
    }

    // ── F4 : Reschedule ───────────────────────────────────────────

    @PatchMapping("/{id}/reschedule")
    public ResponseEntity<AppointmentResponse> reschedule(
            @PathVariable String id,
            @Valid @RequestBody RescheduleRequest req) {
        return ResponseEntity.ok(service.reschedule(id, req));
    }

    // ── Confirmer / Annuler ───────────────────────────────────────

    @PatchMapping("/{id}/confirm")
    public ResponseEntity<AppointmentResponse> confirm(@PathVariable String id) {
        return ResponseEntity.ok(service.confirm(id));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<AppointmentResponse> cancel(@PathVariable String id) {
        return ResponseEntity.ok(service.cancel(id));
    }

    // ── Lier à une session ────────────────────────────────────────

    @PatchMapping("/{id}/link-session/{sessionId}")
    public ResponseEntity<AppointmentResponse> linkToSession(
            @PathVariable String id,
            @PathVariable String sessionId) {
        return ResponseEntity.ok(service.linkToSession(id, sessionId));
    }
}