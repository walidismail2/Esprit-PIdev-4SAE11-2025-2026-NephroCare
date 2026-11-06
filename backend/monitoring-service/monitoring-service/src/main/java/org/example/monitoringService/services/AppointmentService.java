package org.example.monitoringService.services;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.monitoringService.dto.*;
import org.example.monitoringService.entities.Appointment;
import org.example.monitoringService.entities.enums.AppointmentStatus;
import org.example.monitoringService.repositories.AppointmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentService {

    private final AppointmentRepository repository;


    // ══════════════════════════════════════════════════════════════
    // CRUD
    // ══════════════════════════════════════════════════════════════

    @Transactional
    public AppointmentResponse create(AppointmentRequest req) {
        // Vérifie les conflits avant création
        ConflictCheckRequest conflictReq = new ConflictCheckRequest();
        conflictReq.setMedecinId(req.getMedecinId());
        conflictReq.setPatientId(req.getPatientId());
        conflictReq.setAppointmentDate(req.getAppointmentDate());
        conflictReq.setDurationMinutes(req.getDurationMinutes());

        ConflictResponse conflict = checkConflicts(conflictReq);
        if (conflict.isHasConflict()) {
            throw new IllegalStateException(
                    "Conflit détecté : " + conflict.getMessage());
        }

        Appointment saved = repository.save(toEntity(req));
        log.info("RDV créé — id={} type={} patientId={}",
                saved.getId(), saved.getType(), saved.getPatientId());
        return toResponse(saved);
    }

    public List<AppointmentResponse> findAll() {
        return repository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public AppointmentResponse findById(String id) {
        return toResponse(getOrThrow(id));
    }

    @Transactional
    public AppointmentResponse update(String id, AppointmentRequest req) {
        Appointment a = getOrThrow(id);
        a.setPatientId(req.getPatientId());
        a.setPatientNom(req.getPatientNom());
        a.setPatientMatricule(req.getPatientMatricule());
        a.setMedecinId(req.getMedecinId());
        a.setMedecinNom(req.getMedecinNom());
        a.setMedecinSpecialite(req.getMedecinSpecialite());
        a.setAppointmentDate(req.getAppointmentDate());
        a.setDurationMinutes(req.getDurationMinutes());
        a.setType(req.getType());
        a.setNotes(req.getNotes());
        if (req.getStatus() != null) a.setStatus(req.getStatus());
        return toResponse(repository.save(a));
    }

    @Transactional
    public void delete(String id) {
        getOrThrow(id);
        repository.deleteById(id);
        log.info("RDV supprimé — id={}", id);
    }

    // ══════════════════════════════════════════════════════════════
    // F1 — DÉTECTION DE CONFLITS
    // ══════════════════════════════════════════════════════════════

    public ConflictResponse checkConflicts(ConflictCheckRequest req) {
        LocalDateTime start = req.getAppointmentDate();
        LocalDateTime end = start.plusMinutes(req.getDurationMinutes());

        List<Appointment> conflicts = repository.findConflicts(
                req.getMedecinId(),
                req.getPatientId(),
                start, end,
                req.getExcludeAppointmentId()
        );

        if (conflicts.isEmpty()) {
            return new ConflictResponse(false, "Aucun conflit détecté", List.of());
        }

        return new ConflictResponse(
                true,
                conflicts.size() + " conflit(s) détecté(s) sur ce créneau",
                conflicts.stream().map(this::toResponse).collect(Collectors.toList())
        );
    }

    // ══════════════════════════════════════════════════════════════
    // F2 — HISTORIQUE PATIENT PAR MATRICULE
    // ══════════════════════════════════════════════════════════════

    public List<AppointmentHistoryDTO> getPatientHistory(String matricule) {
        List<Appointment> history = repository
                .findByPatientMatriculeOrderByAppointmentDateDesc(matricule);

        if (history.isEmpty()) {
            throw new IllegalArgumentException(
                    "Aucun RDV trouvé pour le matricule : " + matricule);
        }

        return history.stream().map(this::toHistoryDTO).collect(Collectors.toList());
    }

    // ══════════════════════════════════════════════════════════════
    // F3 — STATISTIQUES PAR MÉDECIN
    // ══════════════════════════════════════════════════════════════

    public List<AppointmentStatsDTO> getStats(String medecinId,
                                              LocalDateTime from,
                                              LocalDateTime to) {

        List<Appointment> appointments =
                repository.findForStats(medecinId, from, to);

        long total = appointments.size();
        long confirmed = appointments.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED)
                .count();

        long cancelled = appointments.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.CANCELLED)
                .count();

        return List.of(new AppointmentStatsDTO(
                medecinId,
                total,
                confirmed,
                cancelled
        ));
    }

    // ══════════════════════════════════════════════════════════════
    // F4 — REPROGRAMMATION RAPIDE
    // ══════════════════════════════════════════════════════════════

    @Transactional
    public AppointmentResponse reschedule(String id, RescheduleRequest req) {
        Appointment a = getOrThrow(id);

        if (a.getStatus() == AppointmentStatus.CANCELLED) {
            throw new IllegalStateException(
                    "Impossible de reprogrammer un RDV annulé");
        }

        // Vérifie conflits sur la nouvelle date
        ConflictCheckRequest conflictReq = new ConflictCheckRequest();
        conflictReq.setMedecinId(a.getMedecinId());
        conflictReq.setPatientId(a.getPatientId());
        conflictReq.setAppointmentDate(req.getNewDate());
        conflictReq.setDurationMinutes(a.getDurationMinutes());
        conflictReq.setExcludeAppointmentId(id);

        ConflictResponse conflict = checkConflicts(conflictReq);
        if (conflict.isHasConflict()) {
            throw new IllegalStateException(
                    "Conflit sur la nouvelle date : " + conflict.getMessage());
        }

        // Archive l'ancienne date
        a.setPreviousDate(a.getAppointmentDate());
        a.setAppointmentDate(req.getNewDate());
        a.setStatus(AppointmentStatus.RESCHEDULED);
        if (req.getReason() != null) a.setNotes(req.getReason());

        log.info("RDV reschedulé — id={} newDate={}", id, req.getNewDate());
        return toResponse(repository.save(a));
    }

    // ══════════════════════════════════════════════════════════════
    // CONFIRMER / ANNULER
    // ══════════════════════════════════════════════════════════════

    @Transactional
    public AppointmentResponse confirm(String id) {
        Appointment a = getOrThrow(id);
        if (a.getStatus() != AppointmentStatus.SCHEDULED) {
            throw new IllegalStateException(
                    "Seul un RDV SCHEDULED peut être confirmé");
        }
        a.setStatus(AppointmentStatus.CONFIRMED);
        return toResponse(repository.save(a));
    }

    @Transactional
    public AppointmentResponse cancel(String id) {
        Appointment a = getOrThrow(id);
        if (a.getStatus() == AppointmentStatus.CANCELLED) {
            throw new IllegalStateException("RDV déjà annulé");
        }
        a.setStatus(AppointmentStatus.CANCELLED);
        return toResponse(repository.save(a));
    }

    // ══════════════════════════════════════════════════════════════
    // LIER UN RDV À UNE SESSION
    // ══════════════════════════════════════════════════════════════

    @Transactional
    public AppointmentResponse linkToSession(String appointmentId, String sessionId) {
        Appointment a = getOrThrow(appointmentId);
        a.setSessionId(sessionId);
        log.info("RDV lié à session — appointmentId={} sessionId={}",
                appointmentId, sessionId);
        return toResponse(repository.save(a));
    }

    // ══════════════════════════════════════════════════════════════
    // UTILITAIRES
    // ══════════════════════════════════════════════════════════════

    private Appointment getOrThrow(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "RDV introuvable avec l'id : " + id));
    }

    private Appointment toEntity(AppointmentRequest req) {
        return Appointment.builder()
                .patientId(req.getPatientId())
                .patientNom(req.getPatientNom())
                .patientMatricule(req.getPatientMatricule())
                .medecinId(req.getMedecinId())
                .medecinNom(req.getMedecinNom())
                .medecinSpecialite(req.getMedecinSpecialite())
                .appointmentDate(req.getAppointmentDate())
                .durationMinutes(req.getDurationMinutes())
                .type(req.getType())
                .status(req.getStatus() != null
                        ? req.getStatus() : AppointmentStatus.SCHEDULED)
                .notes(req.getNotes())
                .build();
    }

    public AppointmentResponse toResponse(Appointment a) {
        return AppointmentResponse.builder()
                .id(a.getId())
                .patientId(a.getPatientId())
                .patientNom(a.getPatientNom())
                .patientMatricule(a.getPatientMatricule())
                .medecinId(a.getMedecinId())
                .medecinNom(a.getMedecinNom())
                .medecinSpecialite(a.getMedecinSpecialite())
                .appointmentDate(a.getAppointmentDate())
                .durationMinutes(a.getDurationMinutes())
                .type(a.getType())
                .status(a.getStatus())
                .notes(a.getNotes())
                .previousDate(a.getPreviousDate())
                .sessionId(a.getSessionId())
                .createdAt(a.getCreatedAt())
                .build();
    }

    private AppointmentHistoryDTO toHistoryDTO(Appointment a) {
        return AppointmentHistoryDTO.builder()
                .id(a.getId())
                .appointmentDate(a.getAppointmentDate())
                .type(a.getType())
                .status(a.getStatus())
                .medecinNom(a.getMedecinNom())
                .medecinSpecialite(a.getMedecinSpecialite())
                .durationMinutes(a.getDurationMinutes())
                .notes(a.getNotes())
                .previousDate(a.getPreviousDate())
                .sessionId(a.getSessionId())
                .build();
    }
}
