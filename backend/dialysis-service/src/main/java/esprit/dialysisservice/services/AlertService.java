package esprit.dialysisservice.services;

import esprit.dialysisservice.dtos.response.AlertResponseDTO;
import esprit.dialysisservice.entities.Alert;
import esprit.dialysisservice.entities.DialysisSession;
import esprit.dialysisservice.entities.DialysisTreatment;
import esprit.dialysisservice.repositories.AlertRepository;
import esprit.dialysisservice.repositories.DialysisSessionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;
    private final DialysisSessionRepository sessionRepository;

    @Transactional
    public void createAlertsForCompletedSession(UUID sessionId) {
        DialysisSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found with ID: " + sessionId));

        DialysisTreatment treatment = session.getTreatment();
        if (treatment == null || treatment.getPatientId() == null) {
            return;
        }

        UUID patientId = treatment.getPatientId();

        Double spKtV = session.getSpKtV();
        Double urr = session.getUrr();
        Double uf = session.getUltrafiltrationVolume();
        String bp = session.getPreBloodPressure();
        String complications = safeLower(session.getComplications());

        // ADEQUACY
        if ((spKtV != null && spKtV < 1.2) || (urr != null && urr < 65.0)) {
            createIfMissing(
                    patientId,
                    session.getId(),
                    "WARNING",
                    "ADEQUACY",
                    "Dialysis adequacy below target",
                    "Kt/V or URR is below the expected threshold."
            );
        }

        // HEMODYNAMIC
        int[] parsedBp = parseBp(bp);
        int sys = parsedBp[0];
        int dia = parsedBp[1];

        if ((sys >= 180 || dia >= 120) || complications.contains("hypotens")) {
            createIfMissing(
                    patientId,
                    session.getId(),
                    "CRITICAL",
                    "HEMODYNAMIC",
                    "Hemodynamic instability detected",
                    "Severe blood pressure abnormality or intradialytic hypotension was detected."
            );
        } else if ((sys >= 160 || dia >= 100) || (sys > 0 && sys < 90) || (dia > 0 && dia < 60)) {
            createIfMissing(
                    patientId,
                    session.getId(),
                    "WARNING",
                    "HEMODYNAMIC",
                    "Blood pressure requires attention",
                    "Pre-dialysis blood pressure is outside the desired range."
            );
        }

        // WEIGHT / UF
        if (uf != null && uf > 3.0) {
            createIfMissing(
                    patientId,
                    session.getId(),
                    "WARNING",
                    "WEIGHT",
                    "High ultrafiltration volume",
                    "Ultrafiltration volume is high for this session."
            );
        }

        if (treatment.getTargetDryWeight() != null && session.getWeightAfter() != null) {
            double diff = Math.abs(session.getWeightAfter() - treatment.getTargetDryWeight());
            if (diff >= 3.0) {
                createIfMissing(
                        patientId,
                        session.getId(),
                        "WARNING",
                        "WEIGHT",
                        "Post-dialysis weight far from target",
                        "Post-dialysis weight is significantly different from target dry weight."
                );
            }
        }

        // COMPLICATION
        if (complications.contains("bleed") || complications.contains("chest") || complications.contains("pain")) {
            createIfMissing(
                    patientId,
                    session.getId(),
                    "CRITICAL",
                    "COMPLICATION",
                    "Serious complication reported",
                    "A significant complication was documented during this session."
            );
        } else if (complications.contains("cramp") || complications.contains("nausea") || complications.contains("vomit")) {
            createIfMissing(
                    patientId,
                    session.getId(),
                    "WARNING",
                    "COMPLICATION",
                    "Session complication reported",
                    "A complication was documented during this session."
            );
        }
    }

    @Transactional(readOnly = true)
    public List<AlertResponseDTO> getOpenAlerts() {
        return alertRepository.findByStatusOrderByCreatedAtDesc("OPEN")
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AlertResponseDTO> getAlertsByPatient(UUID patientId) {
        return alertRepository.findByPatientIdOrderByCreatedAtDesc(patientId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AlertResponseDTO> getOpenAlertsByPatient(UUID patientId) {
        return alertRepository.findByPatientIdAndStatusOrderByCreatedAtDesc(patientId, "OPEN")
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public AlertResponseDTO acknowledge(UUID alertId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new EntityNotFoundException("Alert not found with ID: " + alertId));

        alert.setStatus("ACKNOWLEDGED");
        return toDto(alertRepository.save(alert));
    }

    @Transactional
    public AlertResponseDTO resolve(UUID alertId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new EntityNotFoundException("Alert not found with ID: " + alertId));

        alert.setStatus("RESOLVED");
        return toDto(alertRepository.save(alert));
    }

    private void createIfMissing(UUID patientId,
                                 UUID sessionId,
                                 String severity,
                                 String category,
                                 String title,
                                 String message) {
        if (alertRepository.existsBySessionIdAndCategoryAndStatus(sessionId, category, "OPEN")) {
            return;
        }

        Alert alert = Alert.builder()
                .patientId(patientId)
                .sessionId(sessionId)
                .severity(severity)
                .category(category)
                .title(title)
                .message(message)
                .status("OPEN")
                .createdAt(LocalDateTime.now())
                .build();

        alertRepository.save(alert);
    }

    private AlertResponseDTO toDto(Alert alert) {
        return AlertResponseDTO.builder()
                .id(alert.getId())
                .patientId(alert.getPatientId())
                .sessionId(alert.getSessionId())
                .severity(alert.getSeverity())
                .category(alert.getCategory())
                .title(alert.getTitle())
                .message(alert.getMessage())
                .status(alert.getStatus())
                .createdAt(alert.getCreatedAt())
                .build();
    }

    private String safeLower(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT);
    }

    private int[] parseBp(String bp) {
        int sys = -1, dia = -1;
        if (bp != null && bp.contains("/")) {
            try {
                String[] parts = bp.trim().split("/");
                sys = Integer.parseInt(parts[0].trim());
                dia = Integer.parseInt(parts[1].trim());
            } catch (Exception ignored) {
            }
        }
        return new int[]{sys, dia};
    }
}