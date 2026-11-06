package esprit.dialysisservice.controllers;


import esprit.dialysisservice.dtos.response.SessionReportResponseDTO;
import esprit.dialysisservice.entities.SystemConfig;
import esprit.dialysisservice.services.SessionReportService;
import esprit.dialysisservice.services.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class SessionReportController {

    private final SessionReportService reportService;
    private final SystemConfigService systemConfigService;


    // Doctor/Admin: report by sessionId (doctor restricted to own patients)
    @GetMapping("/session/{sessionId}")
    @PreAuthorize("hasAnyRole('admin','ADMIN','doctor','DOCTOR')")
    public ResponseEntity<SessionReportResponseDTO> getReportForDoctorAdmin(
            @PathVariable UUID sessionId,
            Authentication authentication
    ) {
        UUID userId = extractUserId(authentication);
        boolean isAdmin = authentication.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_admin") || a.getAuthority().equals("ROLE_ADMIN")
        );

        return ResponseEntity.ok(reportService.getBySessionIdDoctorAdmin(sessionId, userId, isAdmin));
    }

    // Patient: only own report
    @GetMapping("/my/session/{sessionId}")
    @PreAuthorize("hasAnyRole('patient','PATIENT')")
    public ResponseEntity<SessionReportResponseDTO> getMyReport(
            @PathVariable UUID sessionId,
            Authentication authentication
    ) {
        UUID patientId = extractUserId(authentication);
        return ResponseEntity.ok(reportService.getBySessionIdPatient(sessionId, patientId));
    }
    @GetMapping(value = "/session/{sessionId}/pdf", produces = "application/pdf")
    @PreAuthorize("hasAnyRole('admin','ADMIN','doctor','DOCTOR')")
    public ResponseEntity<byte[]> downloadReportPdfDoctorAdmin(
            @PathVariable UUID sessionId,
            Authentication authentication
    ) {
        UUID userId = extractUserId(authentication);
        boolean isAdmin = authentication.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_admin") || a.getAuthority().equals("ROLE_ADMIN")
        );

        byte[] pdf = reportService.getPdfBySessionIdDoctorAdmin(sessionId, userId, isAdmin);

        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"dialysis-report-" + sessionId + ".pdf\"")
                .header("Cache-Control", "no-store")
                .body(pdf);
    }

    @GetMapping(value = "/my/session/{sessionId}/pdf", produces = "application/pdf")
    @PreAuthorize("hasAnyRole('patient','PATIENT')")
    public ResponseEntity<byte[]> downloadMyReportPdf(
            @PathVariable UUID sessionId,
            Authentication authentication
    ) {
        UUID patientId = extractUserId(authentication);

        byte[] pdf = reportService.getPdfBySessionIdPatient(sessionId, patientId);

        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"dialysis-report-" + sessionId + ".pdf\"")
                .header("Cache-Control", "no-store")
                .body(pdf);
    }
    @PostMapping("/admin/backfill")
    @PreAuthorize("hasAnyRole('admin','ADMIN')")
    public ResponseEntity<Map<String, Object>> backfill(Authentication authentication) {
        UUID adminId = extractUserId(authentication);
        SystemConfig cfg = systemConfigService.getOrCreate();

        int created = reportService.backfillMissingReports(cfg, adminId);

        return ResponseEntity.ok(Map.of(
                "created", created
        ));
    }

    // Adjust this to your existing extraction helper (you already have extractUserId in some controllers)
    private UUID extractUserId(Authentication authentication) {
        JwtAuthenticationToken jwtAuth = (JwtAuthenticationToken) authentication;
        return UUID.fromString(jwtAuth.getToken().getSubject());
    }
}