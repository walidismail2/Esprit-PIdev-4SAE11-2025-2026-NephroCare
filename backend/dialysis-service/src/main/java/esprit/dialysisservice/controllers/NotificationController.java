package esprit.dialysisservice.controllers;

import esprit.dialysisservice.entities.Notification;
import esprit.dialysisservice.services.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('admin','ADMIN','doctor','DOCTOR','nurse','NURSE')")
    public ResponseEntity<List<Notification>> my(Authentication auth) {
        UUID userId = extractUserId(auth);
        return ResponseEntity.ok(notificationService.my(userId));
    }

    @GetMapping("/my/unread-count")
    @PreAuthorize("hasAnyRole('admin','ADMIN','doctor','DOCTOR','nurse','NURSE')")
    public ResponseEntity<Long> unreadCount(Authentication auth) {
        UUID userId = extractUserId(auth);
        return ResponseEntity.ok(notificationService.unreadCount(userId));
    }

    @PostMapping("/{id}/read")
    @PreAuthorize("hasAnyRole('admin','ADMIN','doctor','DOCTOR','nurse','NURSE')")
    public ResponseEntity<Void> markRead(@PathVariable UUID id, Authentication auth) {
        UUID userId = extractUserId(auth);
        notificationService.markRead(id, userId);
        return ResponseEntity.ok().build();
    }

    private UUID extractUserId(Authentication authentication) {
        JwtAuthenticationToken jwtAuth = (JwtAuthenticationToken) authentication;
        return UUID.fromString(jwtAuth.getToken().getSubject());
    }
}