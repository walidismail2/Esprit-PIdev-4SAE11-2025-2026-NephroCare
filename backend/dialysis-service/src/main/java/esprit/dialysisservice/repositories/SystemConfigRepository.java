package esprit.dialysisservice.repositories;

import esprit.dialysisservice.entities.SystemConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SystemConfigRepository extends JpaRepository<SystemConfig, Long> {
    Optional<SystemConfig> findTopByOrderByIdAsc();
}
