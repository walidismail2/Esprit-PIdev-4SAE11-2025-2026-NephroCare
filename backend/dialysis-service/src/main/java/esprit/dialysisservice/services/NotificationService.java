package esprit.dialysisservice.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.dialysisservice.entities.Notification;
import esprit.dialysisservice.entities.enums.NotificationType;
import esprit.dialysisservice.repositories.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository repo;
    private final ObjectMapper mapper;

    @Transactional
    public void push(UUID recipientUserId, NotificationType type, String title, String message,
                     String entityType, UUID entityId, Map<String,Object> payload) {
        String payloadJson = null;
        try {
            if (payload != null) payloadJson = mapper.writeValueAsString(payload);
        } catch (Exception ignored) {}

        repo.save(Notification.builder()
                .id(UUID.randomUUID())
                .recipientUserId(recipientUserId)
                .type(type)
                .title(title)
                .message(message)
                .entityType(entityType)
                .entityId(entityId)
                .payloadJson(payloadJson)
                .createdAt(LocalDateTime.now())
                .build());
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return repo.countByRecipientUserIdAndReadAtIsNull(userId);
    }

    @Transactional
    public void markRead(UUID notifId, UUID userId) {
        Notification n = repo.findById(notifId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!n.getRecipientUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your notification");
        }
        if (n.getReadAt() == null) n.setReadAt(LocalDateTime.now());
        repo.save(n);
    }

    @Transactional(readOnly = true)
    public java.util.List<Notification> my(UUID userId) {
        return repo.findTop200ByRecipientUserIdOrderByCreatedAtDesc(userId);
    }
}