package esprit.order_service.repository;

import esprit.order_service.entity.Delivery;
import esprit.order_service.entity.Enumerations.DeliveryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryRepository extends JpaRepository<Delivery, String> {

    Optional<Delivery> findByOrderId(String orderId);
    List<Delivery> findByStatus(DeliveryStatus status);
    List<Delivery> findByPatientId(String patientId);
    List<Delivery> findByDriverName(String driverName);

    // ✅ JPQL — Livraisons planifiées en retard (scheduler)
    @Query("SELECT d FROM Delivery d WHERE d.status = 'IN_TRANSIT' AND d.scheduledAt < :cutoff")
    List<Delivery> findOverdueDeliveries(LocalDateTime cutoff);

    // ✅ JPQL — Statistiques par statut
    @Query("SELECT d.status, COUNT(d) FROM Delivery d GROUP BY d.status")
    List<Object[]> countGroupedByStatus();

    // ✅ Moyenne du nombre de tentatives
    @Query("SELECT COALESCE(AVG(d.attempts), 0) FROM Delivery d")
    double avgAttempts();

    // ✅ Top livreurs — nb de livraisons totales
    @Query("SELECT d.driverName, COUNT(d) FROM Delivery d GROUP BY d.driverName ORDER BY COUNT(d) DESC")
    List<Object[]> countByDriver();

    // ✅ Top livreurs — nb de livraisons réussies
    @Query("SELECT d.driverName, COUNT(d) FROM Delivery d WHERE d.status = 'DELIVERED' GROUP BY d.driverName")
    List<Object[]> countDeliveredByDriver();
}