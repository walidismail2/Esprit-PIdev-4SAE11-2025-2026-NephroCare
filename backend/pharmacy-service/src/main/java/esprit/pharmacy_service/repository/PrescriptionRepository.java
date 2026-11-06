package esprit.pharmacy_service.repository;

import esprit.pharmacy_service.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PrescriptionRepository extends JpaRepository<Prescription, String> {
    //List<Prescription> findByUserId(String userId);

    // ─── Fix N+1 : charge les medications en une seule requête JOIN ───────────
    @Query("SELECT DISTINCT p FROM Prescription p LEFT JOIN FETCH p.medications")
    List<Prescription> findAllWithMedications();

    @Query("SELECT DISTINCT p FROM Prescription p LEFT JOIN FETCH p.medications WHERE p.userId = :userId")
    List<Prescription> findByUserId(@Param("userId") String userId);

    @Query("SELECT DISTINCT p FROM Prescription p LEFT JOIN FETCH p.medications WHERE p.id = :id")
    Optional<Prescription> findByIdWithMedications(@Param("id") String id);
}
