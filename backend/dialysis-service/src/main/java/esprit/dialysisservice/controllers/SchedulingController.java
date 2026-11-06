package esprit.dialysisservice.controllers;


import esprit.dialysisservice.dtos.response.ScheduledSessionResponseDTO;
import esprit.dialysisservice.dtos.schedule.ConfirmScheduleRequestDTO;
import esprit.dialysisservice.entities.ScheduledSession;
import esprit.dialysisservice.entities.enums.ScheduledStatus;
import esprit.dialysisservice.repositories.ScheduledSessionRepository;
import esprit.dialysisservice.services.SchedulingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/schedule")
@RequiredArgsConstructor
public class SchedulingController {

    private final SchedulingService schedulingService;

    private UUID extractUserId(Authentication authentication) {
        JwtAuthenticationToken jwtAuth = (JwtAuthenticationToken) authentication;
        return UUID.fromString(jwtAuth.getToken().getSubject());
    }

    // Nurse: list of scheduled sessions for today
    @GetMapping("/my-today")
    @PreAuthorize("hasAnyRole('nurse','NURSE')")
    public ResponseEntity<List<ScheduledSessionResponseDTO>> myToday(Authentication authentication) {
        UUID nurseId = extractUserId(authentication);
        return ResponseEntity.ok(schedulingService.getMyToday(nurseId));
    }
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('nurse','NURSE')")
    public ResponseEntity<List<ScheduledSessionResponseDTO>> mySchedule(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication
    ) {
        UUID nurseId = extractUserId(authentication);
        return ResponseEntity.ok(schedulingService.getMyBetween(nurseId, from, to));
    }

    // Doctor/Admin: confirm a plan -> create scheduled sessions
    @PostMapping("/confirm")
    @PreAuthorize("hasAnyRole('doctor','DOCTOR','admin','ADMIN')")
    public ResponseEntity<List<ScheduledSessionResponseDTO>> confirm(
            @Valid @RequestBody ConfirmScheduleRequestDTO dto,
            Authentication authentication
    ) {
        UUID userId = extractUserId(authentication); // doctor/admin
        return ResponseEntity.ok(schedulingService.confirm(dto, userId));
    }
}