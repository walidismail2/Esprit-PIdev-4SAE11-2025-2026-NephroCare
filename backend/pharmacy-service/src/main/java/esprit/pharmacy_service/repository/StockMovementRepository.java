package esprit.pharmacy_service.repository;
import esprit.pharmacy_service.entity.Enumerations.MovementType;
import esprit.pharmacy_service.entity.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Map;
public interface StockMovementRepository extends JpaRepository<StockMovement, String> {

    List<StockMovement> findByMedicationIdOrderByCreatedAtDesc(String medicationId);

    List<StockMovement> findAllByOrderByCreatedAtDesc();

    List<StockMovement> findByPrescriptionId(String prescriptionId);

    List<StockMovement> findByType(MovementType type);
}