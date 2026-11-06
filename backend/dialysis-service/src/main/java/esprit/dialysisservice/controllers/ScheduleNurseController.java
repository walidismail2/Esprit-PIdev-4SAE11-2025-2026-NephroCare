package esprit.dialysisservice.controllers;

import esprit.dialysisservice.dtos.request.RejectAssignmentRequestDTO;
import esprit.dialysisservice.dtos.response.ScheduledSessionResponseDTO;
import esprit.dialysisservice.services.SchedulingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/schedule")
@RequiredArgsConstructor
public class ScheduleNurseController {

    private final SchedulingService schedulingService;

    @PostMapping("/{scheduledSessionId}/accept")
    @PreAuthorize("hasAnyRole('nurse','NURSE')")
    public ResponseEntity<ScheduledSessionResponseDTO> accept(
            @PathVariable UUID scheduledSessionId,
            Authentication auth
    ) {
        UUID nurseId = extractUserId(auth);
        return ResponseEntity.ok(schedulingService.nurseAccept(scheduledSessionId, nurseId));
    }

    @PostMapping("/{scheduledSessionId}/reject")
    @PreAuthorize("hasAnyRole('nurse','NURSE')")
    public ResponseEntity<ScheduledSessionResponseDTO> reject(
            @PathVariable UUID scheduledSessionId,
            @RequestBody(required = false) RejectAssignmentRequestDTO dto,
            Authentication auth
    ) {
        UUID nurseId = extractUserId(auth);

        String reason = null;
        if (dto != null && dto.getReason() != null) {
            reason = dto.getReason().trim();
            if (reason.isEmpty()) reason = null;
        }

        return ResponseEntity.ok(
                schedulingService.nurseRejectAndAutoReassign(scheduledSessionId, nurseId, reason)
        );
    }

    @GetMapping("/my/pending")
    @PreAuthorize("hasAnyRole('nurse','NURSE')")
    public ResponseEntity<List<ScheduledSessionResponseDTO>> myPending(Authentication auth) {
        UUID nurseId = extractUserId(auth);
        return ResponseEntity.ok(schedulingService.getMyPendingAssignments(nurseId));
    }

    private UUID extractUserId(Authentication authentication) {
        JwtAuthenticationToken jwtAuth = (JwtAuthenticationToken) authentication;
        return UUID.fromString(jwtAuth.getToken().getSubject());
    }
}