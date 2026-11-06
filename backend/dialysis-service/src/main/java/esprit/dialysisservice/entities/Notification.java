package esprit.dialysisservice.entities;

import esprit.dialysisservice.entities.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name="notifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {

    @Id
    private UUID id;

    @Column(name="recipient_user_id", nullable = false)
    private UUID recipientUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(name="entity_type")
    private String entityType;

    @Column(name="entity_id")
    private UUID entityId;

    @Column(name="payload_json", columnDefinition = "json")
    private String payloadJson; // keep String to avoid DB portability issues

    @Column(name="read_at")
    private LocalDateTime readAt;

    @Column(name="created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}