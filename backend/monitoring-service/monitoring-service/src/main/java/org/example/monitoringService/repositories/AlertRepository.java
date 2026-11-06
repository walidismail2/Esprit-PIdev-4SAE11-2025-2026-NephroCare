package org.example.monitoringService.repositories;

import org.example.monitoringService.entities.Alert;
import org.example.monitoringService.entities.enums.Severity;
import org.example.monitoringService.entities.enums.TestType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, String> {

    // ── CRUD de base ──────────────────────────────────────────────

    List<Alert> findByPatientMatricule(String patientMatricule);
    List<Alert> findByCreatedBy(String createdBy);

    // ── F1 : Alertes actives (non résolues) ───────────────────────

    // Toutes les alertes non résolues, triées par date de création DESC
    List<Alert> findByResolvedFalseOrderByCreatedAtDesc();

    // Alertes CRITICAL non résolues uniquement
    @Query("SELECT a FROM Alert a WHERE a.resolved = false AND a.severity = 'CRITICAL' " +
            "ORDER BY a.createdAt DESC")
    List<Alert> findCriticalActive();

    // ── F2 : Filtrage par sévérité ────────────────────────────────

    // Toutes les alertes d'une sévérité donnée, triées par date DESC
    List<Alert> findBySeverity(Severity severity);
    // Distribution : nombre d'alertes par sévérité
    @Query("SELECT a.severity, COUNT(a) FROM Alert a GROUP BY a.severity")
    List<Object[]> countBySeverity();

    // ── F3 : Résolution ───────────────────────────────────────────

    // Alertes actives d'un patient (pour resolve-all)
    List<Alert> findByPatientMatriculeAndResolvedFalse(String patientMatricule);

    // ── F4 : Génération depuis diagnostic ─────────────────────────

    // Alertes liées à un orderId de diagnostic
    List<Alert> findByOrderId(String orderId);

    // Alertes d'un patient liées à un type de biomarqueur
    List<Alert> findByPatientMatriculeAndType(String patientMatricule, TestType type);

    // Alertes CRITICAL des dernières 24h (tableau de bord)
    @Query("SELECT a FROM Alert a WHERE a.severity = 'CRITICAL' " +
            "AND a.createdAt >= :since ORDER BY a.createdAt DESC")
    List<Alert> findRecentCritical(@Param("since") LocalDateTime since);

    // Stats par type pour un patient (suivi longitudinal)
    @Query("SELECT a.type, COUNT(a) FROM Alert a " +
            "WHERE a.patientMatricule = :patientMatricule GROUP BY a.type")
    List<Object[]> countByTypeForPatient(@Param("patientMatricule") String patientMatricule);

    List<Alert> findByPatientMatriculeAndSeverityAndResolvedFalse(
            String patientMatricule,
            Severity severity
    );
    long countBySeverity(Severity severity);

    long countByResolvedFalse();
}