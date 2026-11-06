package esprit.order_service.repository;

import esprit.order_service.entity.Enumerations.OrderStatus;
import esprit.order_service.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, String> {

    List<Order> findByPatientId(String patientId);
    List<Order> findByStatus(OrderStatus status);
    List<Order> findByPatientIdAndStatus(String patientId, OrderStatus status);
    List<Order> findByPrescriptionId(String prescriptionId);

    long countByStatus(OrderStatus status);

    // ── SCHEDULER 1 : commandes PENDING depuis plus de 24h ───────────
    @Query("SELECT o FROM Order o WHERE o.status = 'PENDING' AND o.createdAt < :cutoff")
    List<Order> findPendingOrdersOlderThan(@Param("cutoff") LocalDateTime cutoff);

    // ── SCHEDULER 2 : commandes PENDING entre 10 min et 24h ──────────
    // (entre confirmCutoff et cancelCutoff pour éviter le chevauchement
    //  avec le SCHEDULER 1 qui annule les > 24h)
    @Query("SELECT o FROM Order o WHERE o.status = 'PENDING' " +
            "AND o.createdAt < :confirmCutoff " +
            "AND o.createdAt > :cancelCutoff")
    List<Order> findPendingOrdersBetween(
            @Param("confirmCutoff") LocalDateTime confirmCutoff,
            @Param("cancelCutoff")  LocalDateTime cancelCutoff);

    // ── Fix N+1 : charge les items en JOIN ────────────────────────────
    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items")
    List<Order> findAllWithItems();

    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items WHERE o.patientId = :patientId")
    List<Order> findByPatientIdWithItems(@Param("patientId") String patientId);

    // ✅ Revenus totaux (commandes livrées uniquement)
    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status = 'DELIVERED'")
    double sumRevenueDelivered();

    // ✅ Montant moyen toutes commandes
    @Query("SELECT COALESCE(AVG(o.totalAmount), 0) FROM Order o")
    double avgOrderValue();

    // ✅ Patients distincts ayant commandé
    @Query("SELECT DISTINCT o.patientId FROM Order o ORDER BY o.patientId")
    List<String> findDistinctPatientIds();

}