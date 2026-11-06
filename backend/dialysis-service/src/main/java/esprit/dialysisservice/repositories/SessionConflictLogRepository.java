package esprit.dialysisservice.repositories;


import esprit.dialysisservice.entities.SessionConflictLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface SessionConflictLogRepository extends JpaRepository<SessionConflictLog, UUID> {
    List<SessionConflictLog> findByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime after);
    List<SessionConflictLog> findAllByOrderByCreatedAtDesc();
}
