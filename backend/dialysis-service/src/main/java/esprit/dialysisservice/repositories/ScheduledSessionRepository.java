package esprit.dialysisservice.repositories;

import esprit.dialysisservice.entities.ScheduledSession;
import esprit.dialysisservice.entities.enums.DialysisShift;
import esprit.dialysisservice.entities.enums.NurseConfirmationStatus;
import esprit.dialysisservice.entities.enums.ScheduledStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScheduledSessionRepository extends JpaRepository<ScheduledSession, UUID> {

    boolean existsByTreatmentIdAndDayAndShift(UUID treatmentId, LocalDate day, DialysisShift shift);

    boolean existsByNurseIdAndDayAndShiftAndStatusIn(
            UUID nurseId,
            LocalDate day,
            DialysisShift shift,
            List<ScheduledStatus> statuses
    );
    List<ScheduledSession> findAllByNurseIdAndDayAndStatus(UUID nurseId, LocalDate day, ScheduledStatus status);
    Optional<ScheduledSession> findFirstByTreatmentIdAndNurseIdAndDayAndShiftAndStatus(
            UUID treatmentId, UUID nurseId, LocalDate day, DialysisShift shift, ScheduledStatus status
    );
    Optional<ScheduledSession> findBySessionId(UUID sessionId);
    List<ScheduledSession> findAllByNurseIdAndDayBetweenOrderByDayAscShiftAsc(UUID nurseId, LocalDate from, LocalDate to);
    // for auto-reassign we also block if nurse already has pending/accepted assignment in same slot
    boolean existsByNurseIdAndDayAndShiftAndStatusInAndNurseConfirmationIn(
            UUID nurseId, LocalDate day, DialysisShift shift,
            List<ScheduledStatus> statuses,
            List<NurseConfirmationStatus> confirmations
    );
    List<ScheduledSession> findByNurseIdAndNurseConfirmationOrderByDayAsc(UUID nurseId, NurseConfirmationStatus status);
    List<ScheduledSession> findByNurseIdAndNurseConfirmationAndDayGreaterThanEqualOrderByDayAsc(
            UUID nurseId, NurseConfirmationStatus status, LocalDate day
    );


}