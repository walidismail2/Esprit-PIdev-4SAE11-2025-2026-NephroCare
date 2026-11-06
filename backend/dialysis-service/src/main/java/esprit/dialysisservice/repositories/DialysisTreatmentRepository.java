package esprit.dialysisservice.repositories;

import esprit.dialysisservice.entities.DialysisTreatment;
import esprit.dialysisservice.entities.enums.TreatmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DialysisTreatmentRepository extends JpaRepository<DialysisTreatment, UUID> {

    List<DialysisTreatment> findByPatientId(UUID patientId);

    List<DialysisTreatment> findByDoctorId(UUID doctorId);

    Optional<DialysisTreatment> findByIdAndDoctorId(UUID id, UUID doctorId);

    boolean existsByIdAndDoctorId(UUID id, UUID doctorId);
    List<DialysisTreatment> findByStatusOrderBySuspendedAtDesc(TreatmentStatus status);

}
