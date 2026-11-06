package esprit.dialysisservice.repositories;

import esprit.dialysisservice.entities.SessionReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SessionReportRepository extends JpaRepository<SessionReport, UUID> {
    Optional<SessionReport> findBySessionId(UUID sessionId);
    boolean existsBySessionId(UUID sessionId);

}