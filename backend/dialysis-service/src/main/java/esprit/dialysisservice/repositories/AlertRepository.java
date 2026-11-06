package esprit.dialysisservice.repositories;

import esprit.dialysisservice.entities.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AlertRepository extends JpaRepository<Alert, UUID> {

    List<Alert> findByStatusOrderByCreatedAtDesc(String status);

    List<Alert> findByPatientIdOrderByCreatedAtDesc(UUID patientId);

    List<Alert> findByPatientIdAndStatusOrderByCreatedAtDesc(UUID patientId, String status);

    boolean existsBySessionIdAndCategoryAndStatus(UUID sessionId, String category, String status);
}