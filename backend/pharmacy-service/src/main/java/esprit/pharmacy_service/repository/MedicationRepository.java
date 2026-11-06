package esprit.pharmacy_service.repository;

import esprit.pharmacy_service.entity.Medication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MedicationRepository extends JpaRepository<Medication, String> {
    Optional<Medication> findByMedicationNameIgnoreCase(String medicationName);
    List<Medication> findByUserId(String userId);

    // ─── Fix SCHEDULER 1 : récupère directement les médicaments expirés ───────
    // Évite le findAll() + stream().filter() en mémoire
    @Query("SELECT m FROM Medication m WHERE m.endDate < :today AND m.quantity > 0")
    List<Medication> findExpiredWithStock(@Param("today") LocalDate today);

    // ─── Fix SCHEDULER 2 : récupère directement les médicaments en stock faible ─
    // Non expirés et quantité entre 1 et le seuil
    @Query("SELECT m FROM Medication m WHERE m.quantity > 0 AND m.quantity <= :threshold " +
            "AND m.endDate >= :today")
    List<Medication> findLowStockNotExpired(@Param("threshold") int threshold,
                                            @Param("today") LocalDate today);


}
