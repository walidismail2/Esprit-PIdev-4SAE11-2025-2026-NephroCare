package esprit.clinicalservice.repositories;

import esprit.clinicalservice.entities.PreoperativeAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface PreoperativeAssessmentRepository extends JpaRepository<PreoperativeAssessment, Long> {
    Optional<PreoperativeAssessment> findTopByPatientIdOrderByAssessmentDateDescCreatedAtDesc(Long patientId);
    List<PreoperativeAssessment> findByStatus(String status);
    List<PreoperativeAssessment> findByPatientIdOrderByAssessmentDateDesc(Long patientId);
}
