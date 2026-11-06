package esprit.dialysisservice.controllers;

import esprit.dialysisservice.dtos.request.CreateDialysisSessionRequestDTO;
import esprit.dialysisservice.dtos.request.EndSessionRequestDTO;
import esprit.dialysisservice.dtos.request.UpdateDialysisSessionRequestDTO;
import esprit.dialysisservice.dtos.response.DialysisSessionResponseDTO;
import esprit.dialysisservice.dtos.solver.SolverSuggestResponseDTO;
import esprit.dialysisservice.entities.ScheduledSession;
import esprit.dialysisservice.entities.enums.ScheduledStatus;
import esprit.dialysisservice.repositories.ScheduledSessionRepository;
import esprit.dialysisservice.services.DialysisSolverService;
import esprit.dialysisservice.services.IDialysisSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;


import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class DialysisSessionController {

    private final IDialysisSessionService sessionService;
    private final DialysisSolverService dialysisSolverService;

    private UUID extractPatientId(Authentication authentication) {
        JwtAuthenticationToken jwtAuth = (JwtAuthenticationToken) authentication;
        return UUID.fromString(jwtAuth.getToken().getSubject());
    }


    @PostMapping
    @PreAuthorize("hasAnyRole('nurse','NURSE')")
    public ResponseEntity<DialysisSessionResponseDTO> createSession(
            @Valid @RequestBody CreateDialysisSessionRequestDTO dto
    ) {
        return ResponseEntity.ok(sessionService.createSession(dto));
    }

    @PutMapping("/{id}/end")
    @PreAuthorize("hasAnyRole('nurse','NURSE')")
    public ResponseEntity<DialysisSessionResponseDTO> endSession(
            @PathVariable UUID id,
            @Valid @RequestBody EndSessionRequestDTO body
    ) {
        return ResponseEntity.ok(
                sessionService.endSession(id, body.getWeightAfter(), body.getPostDialysisUrea(), body.getPreDialysisUrea())
        );
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('nurse','NURSE')")
    public ResponseEntity<DialysisSessionResponseDTO> updateSession(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateDialysisSessionRequestDTO dto
    ) {
        return ResponseEntity.ok(sessionService.updateSession(id, dto));
    }

    @GetMapping("/treatment/{treatmentId}")
    @PreAuthorize("hasAnyRole('admin','ADMIN','doctor','DOCTOR','nurse','NURSE')")
    public ResponseEntity<List<DialysisSessionResponseDTO>> getSessionsByTreatment(@PathVariable UUID treatmentId) {
        return ResponseEntity.ok(sessionService.getSessionsByTreatment(treatmentId));
    }

    @GetMapping("/treatment/{treatmentId}/ktv-average")
    @PreAuthorize("hasAnyRole('admin','ADMIN','doctor','DOCTOR','nurse','NURSE')")
    public ResponseEntity<Map<String, Double>> getAverageKtV(@PathVariable UUID treatmentId) {
        Double avg = sessionService.calculateAverageKtV(treatmentId);
        return ResponseEntity.ok(Map.of("averageKtV", avg));
    }

    @GetMapping("/patient/{patientId}/history")
    @PreAuthorize("hasAnyRole('admin','ADMIN','doctor','DOCTOR','nurse','NURSE')")
    public ResponseEntity<List<DialysisSessionResponseDTO>> getPatientHistory(@PathVariable UUID patientId) {
        return ResponseEntity.ok(sessionService.getPatientHistory(patientId));
    }

    // ========================
    // PATIENT: "MY" HISTORY (Frontoffice)
    // ========================
    @GetMapping("/my-history")
    public ResponseEntity<List<DialysisSessionResponseDTO>> myHistory(Authentication authentication) {
        UUID patientId = extractPatientId(authentication);
        return ResponseEntity.ok(sessionService.getPatientHistory(patientId));
    }


    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin','ADMIN')")
    public ResponseEntity<Void> deleteSession(@PathVariable UUID id) {
        sessionService.deleteSession(id);
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/solver/suggest")
    @PreAuthorize("hasAnyRole('admin','ADMIN','doctor','DOCTOR','nurse','NURSE')")
    public SolverSuggestResponseDTO suggestSchedule(
            @RequestParam UUID treatmentId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam int count,
            @RequestParam(required = false) List<UUID> nurseIds
    ) {
        return dialysisSolverService.suggest(treatmentId, from, to, count, nurseIds);
    }


}
