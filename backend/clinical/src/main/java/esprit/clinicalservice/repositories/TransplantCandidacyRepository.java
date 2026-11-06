package esprit.clinicalservice.repositories;

import esprit.clinicalservice.entities.TransplantCandidacy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface TransplantCandidacyRepository extends JpaRepository<TransplantCandidacy, Long> {
    Optional<TransplantCandidacy> findByPatientId(Long patientId);
    List<TransplantCandidacy> findByStatus(String status);
    List<TransplantCandidacy> findByEligibilityScoreGreaterThanEqual(Integer score);
}
