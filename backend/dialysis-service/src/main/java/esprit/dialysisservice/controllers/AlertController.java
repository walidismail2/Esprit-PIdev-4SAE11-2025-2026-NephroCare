package esprit.dialysisservice.controllers;

import esprit.dialysisservice.dtos.response.AlertResponseDTO;
import esprit.dialysisservice.services.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    // Backoffice: doctor / nurse / admin
    @GetMapping("/open")
    @PreAuthorize("hasAnyRole('doctor','nurse','admin','DOCTOR','NURSE','ADMIN')")
    public List<AlertResponseDTO> getOpenAlerts() {
        return alertService.getOpenAlerts();
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('doctor','nurse','admin','DOCTOR','NURSE','ADMIN')")
    public List<AlertResponseDTO> getAlertsByPatient(@PathVariable UUID patientId) {
        return alertService.getAlertsByPatient(patientId);
    }

    @PatchMapping("/{alertId}/acknowledge")
    @PreAuthorize("hasAnyRole('doctor','nurse','admin','DOCTOR','NURSE','ADMIN')")
    public AlertResponseDTO acknowledge(@PathVariable UUID alertId) {
        return alertService.acknowledge(alertId);
    }

    @PatchMapping("/{alertId}/resolve")
    @PreAuthorize("hasAnyRole('doctor','nurse','admin','DOCTOR','NURSE','ADMIN')")
    public AlertResponseDTO resolve(@PathVariable UUID alertId) {
        return alertService.resolve(alertId);
    }

    // Frontoffice patient
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('patient','PATIENT')")
    public List<AlertResponseDTO> getMyAlerts(Authentication authentication) {
        UUID patientId = extractUserId(authentication);
        return alertService.getAlertsByPatient(patientId);
    }

    @GetMapping("/my/open")
    @PreAuthorize("hasAnyRole('patient','PATIENT')")
    public List<AlertResponseDTO> getMyOpenAlerts(Authentication authentication) {
        UUID patientId = extractUserId(authentication);
        return alertService.getOpenAlertsByPatient(patientId);
    }

    private UUID extractUserId(Authentication authentication) {
        if (authentication == null || !(authentication instanceof JwtAuthenticationToken jwtAuth)) {
            throw new IllegalStateException("Invalid authentication context");
        }
        return UUID.fromString(jwtAuth.getToken().getSubject());
    }
}