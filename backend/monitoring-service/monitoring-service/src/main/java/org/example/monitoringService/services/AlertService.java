package org.example.monitoringService.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.monitoringService.dto.AlertCreateDTO;
import org.example.monitoringService.dto.AlertResponseDTO;
import org.example.monitoringService.dto.AlertUpdateDTO;
import org.example.monitoringService.dto.DiagnosticResultDTO;
import org.example.monitoringService.entities.Alert;
import org.example.monitoringService.entities.enums.Severity;
import org.example.monitoringService.entities.enums.TestType;
import org.example.monitoringService.exceptions.AlertNotFoundException;
import org.example.monitoringService.repositories.AlertRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;


import java.time.LocalDateTime;
import java.util.*;

import static java.util.stream.Collectors.toList;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertRepository repository;
    private final SimpMessagingTemplate messagingTemplate;


    // ─────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────
    @Transactional
    public AlertResponseDTO create(AlertCreateDTO dto) {

        Alert alert = Alert.builder()
                .message(dto.getMessage())
                .value(dto.getValue())
                .type(dto.getType())
                .severity(computeSeverity(dto.getType(), dto.getValue()))
                .patientMatricule(dto.getPatientMatricule())
                .resolved(false)
                .build();

        Alert saved = repository.save(alert);

        AlertResponseDTO response = toDTO(saved);

        // 🔥 PUSH temps réel
        messagingTemplate.convertAndSend("/topic/alerts", response);

        return response;
    }

    // ─────────────────────────────────────────
    // UPDATE (STRICT BUSINESS RULES)
    // ─────────────────────────────────────────
    @Transactional
    public AlertResponseDTO update(String id, AlertUpdateDTO dto) {

        Alert alert = getOrThrow(id);

        if (alert.isResolved()) {
            throw new IllegalStateException("Impossible de modifier une alerte résolue");
        }

        alert.setMessage(dto.getMessage());
        alert.setValue(dto.getValue());
        alert.setKidneyFunctionStage(dto.getKidneyFunctionStage());

        return toDTO(repository.save(alert));
    }

    // ─────────────────────────────────────────
    // RESOLVE
    // ─────────────────────────────────────────
    @Transactional
    public AlertResponseDTO resolve(String id, String handledBy) {

        Alert alert = getOrThrow(id);

        if (alert.isResolved()) {
            throw new IllegalStateException("Alerte déjà résolue");
        }

        alert.setResolved(true);
        alert.setResolvedAt(LocalDateTime.now());
        alert.setHandledBy(handledBy);

        return toDTO(repository.save(alert));
    }

    // ─────────────────────────────────────────
    // GET ALL
    // ─────────────────────────────────────────
    public List<AlertResponseDTO> getAll() {
        return repository.findAll()
                .stream()
                .map(this::toDTO)
                .toList();
    }

    public AlertResponseDTO getById(String id) {
        return toDTO(getOrThrow(id));
    }

    @Transactional
    public void delete(String id) {
        if (!repository.existsById(id))
            throw new AlertNotFoundException(id);

        repository.deleteById(id);
    }

    // ─────────────────────────────────────────
    // BUSINESS QUERIES
    // ─────────────────────────────────────────
    public List<AlertResponseDTO> getActive() {
        return repository.findByResolvedFalseOrderByCreatedAtDesc()
                .stream().map(this::toDTO).toList();
    }

    public List<AlertResponseDTO> getCriticalActive() {
        return repository.findCriticalActive()
                .stream().map(this::toDTO).toList();
    }

    public List<AlertResponseDTO> getRecentCritical() {
        return repository.findRecentCritical(LocalDateTime.now().minusHours(24))
                .stream()
                .map(this::toDTO)
                .toList();
    }

    public List<AlertResponseDTO> getBySeverity(String level) {
        Severity severity = Severity.valueOf(level.toUpperCase());

        return repository.findBySeverity(severity)
                .stream().map(this::toDTO).collect(toList());
    }


    // ─────────────────────────────────────────
    // GENERATION FROM DIAGNOSTIC
    // ─────────────────────────────────────────
    @Transactional
    public AlertResponseDTO generateFromDiagnostic(DiagnosticResultDTO dto) {

        Severity severity = computeSeverity(dto.getTestType(), dto.getNumericValue());
        String message = buildMessage(dto, severity);

        Alert alert = Alert.builder()
                .message(message)
                .value(dto.getNumericValue())
                .type(dto.getTestType())
                .severity(severity)
                .patientMatricule(dto.getPatientMatricule())
                .orderId(dto.getOrderId())
                .resolved(false)
                .build();

        return toDTO(repository.save(alert));
    }

    // ─────────────────────────────────────────
    // SEVERITY LOGIC
    // ─────────────────────────────────────────
    private Severity computeSeverity(TestType type, double value) {

        return switch (type) {

            case CREATININE -> {
                if (value >= 500) yield Severity.CRITICAL;
                if (value >= 200) yield Severity.HIGH;
                if (value >= 100) yield Severity.MEDIUM;
                yield Severity.LOW;
            }

            case POTASSIUM -> {
                if (value >= 6.5 || value <= 2.5) yield Severity.CRITICAL;
                if (value >= 5.5 || value <= 3.0) yield Severity.HIGH;
                if (value >= 5.0 || value <= 3.5) yield Severity.MEDIUM;
                yield Severity.LOW;
            }

            case UREA -> {
                if (value >= 30) yield Severity.CRITICAL;
                if (value >= 20) yield Severity.HIGH;
                if (value >= 10) yield Severity.MEDIUM;
                yield Severity.LOW;
            }

            case GFR -> {
                if (value <= 15) yield Severity.CRITICAL;
                if (value <= 30) yield Severity.HIGH;
                if (value <= 60) yield Severity.MEDIUM;
                yield Severity.LOW;
            }

            case PROTEINURIA -> {
                if (value >= 3000) yield Severity.CRITICAL;
                if (value >= 1000) yield Severity.HIGH;
                if (value >= 300) yield Severity.MEDIUM;
                yield Severity.LOW;
            }
        };
    }

    private String buildMessage(DiagnosticResultDTO dto, Severity severity) {
        return "[" + severity + "] " +
                dto.getTestType() + " = " +
                dto.getNumericValue();
    }

    // ─────────────────────────────────────────
    // UTIL
    // ─────────────────────────────────────────
    private Alert getOrThrow(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new AlertNotFoundException(id));
    }

    private AlertResponseDTO toDTO(Alert a) {
        return AlertResponseDTO.builder()
                .id(a.getId())
                .message(a.getMessage())
                .value(a.getValue())
                .type(a.getType())
                .severity(a.getSeverity())
                .resolved(a.isResolved())
                .patientMatricule(a.getPatientMatricule())
                .orderId(a.getOrderId())
                .createdBy(a.getCreatedBy())
                .handledBy(a.getHandledBy())
                .createdAt(a.getCreatedAt())
                .resolvedAt(a.getResolvedAt())
                .ageGroup(a.getAgeGroup())
                .kidneyFunctionStage(a.getKidneyFunctionStage())
                .build();
    }

    public List<AlertResponseDTO> getCriticalAlertsForPatient(String patientId) {
        return repository.findByPatientMatriculeAndSeverityAndResolvedFalse(
                patientId,
                Severity.CRITICAL
        ).stream().map(this::toDTO).toList();
    }

    public Map<String, Long> getAlertStatsByPatient(String patientMatricule) {
        Map<String, Long> stats = new HashMap<>();
        repository.countByTypeForPatient(patientMatricule)
                .forEach(row -> stats.put(row[0].toString(), (Long) row[1]));

        return stats;
    }

    public int computeKidneyRiskScore(String patientMatricule){

        List<Alert> alerts = repository.findByPatientMatriculeAndResolvedFalse(patientMatricule);

        int score = 0;

        for(Alert a : alerts){

            switch (a.getSeverity()){

                case CRITICAL -> score += 5;
                case HIGH -> score += 3;
                case MEDIUM -> score += 2;
                case LOW -> score += 1;
            }
        }

        return score;
    }
    public Map<String, Object> getDashboardAnalytics() {

        Map<String, Object> data = new HashMap<>();

        data.put("totalAlerts", repository.count());
        data.put("criticalAlerts", repository.countBySeverity(Severity.CRITICAL));
        data.put("activeAlerts", repository.countByResolvedFalse());

        return data;
    }

}