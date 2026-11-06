package org.example.monitoringService.repositories;

import org.example.monitoringService.dto.AppointmentStatsDTO;
import org.example.monitoringService.entities.Appointment;
import org.example.monitoringService.entities.enums.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, String> {

    // ── F2 : Historique patient ───────────────────────────────────
    List<Appointment> findByPatientMatriculeOrderByAppointmentDateDesc(String matricule);

    // ── F1 : Détection de conflits ────────────────────────────────
    @Query("""
        SELECT a FROM Appointment a
        WHERE a.status NOT IN (
            org.example.monitoringService.entities.enums.AppointmentStatus.CANCELLED,
            org.example.monitoringService.entities.enums.AppointmentStatus.NO_SHOW
        )
        AND (a.medecinId = :medecinId OR a.patientId = :patientId)
        AND a.appointmentDate < :end
        AND FUNCTION('ADDTIME', a.appointmentDate,
                     FUNCTION('SEC_TO_TIME', a.durationMinutes * 60)) > :start
        AND (:excludeId IS NULL OR a.id <> :excludeId)
    """)
    List<Appointment> findConflicts(
            @Param("medecinId") String medecinId,
            @Param("patientId") String patientId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("excludeId") String excludeId
    );

    // ── F3 : Statistiques par médecin ─────────────────────────────
    @Query("""
    SELECT a FROM Appointment a
    WHERE (:medecinId IS NULL OR a.medecinId = :medecinId)
    AND (:from IS NULL OR a.appointmentDate >= :from)
    AND (:to IS NULL OR a.appointmentDate <= :to)
""")
    List<Appointment> findForStats(
            @Param("medecinId") String medecinId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    // ── Utilitaires ───────────────────────────────────────────────
    List<Appointment> findByPatientIdOrderByAppointmentDateDesc(String patientId);
    List<Appointment> findByMedecinId(String medecinId);
    List<Appointment> findByStatus(AppointmentStatus status);
}