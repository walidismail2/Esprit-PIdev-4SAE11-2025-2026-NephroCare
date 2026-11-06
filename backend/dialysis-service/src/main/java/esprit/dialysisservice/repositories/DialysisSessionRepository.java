package esprit.dialysisservice.repositories;

import esprit.dialysisservice.entities.DialysisSession;
import esprit.dialysisservice.entities.enums.DialysisShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface DialysisSessionRepository extends JpaRepository<DialysisSession, UUID> {

    boolean existsByTreatment_IdAndWeightAfterIsNull(UUID treatmentId);

    boolean existsByNurseIdAndWeightAfterIsNull(UUID nurseId);

    long countByShiftAndSessionDateBetweenAndWeightAfterIsNull(DialysisShift shift, LocalDateTime start, LocalDateTime end);

    List<DialysisSession> findByTreatment_IdOrderBySessionDateDesc(UUID treatmentId);

    List<DialysisSession> findByTreatmentPatientId(UUID patientId);

    void deleteByTreatment_Id(UUID treatmentId);
    List<DialysisSession> findTop10ByTreatment_IdAndWeightAfterIsNotNullOrderBySessionDateDesc(UUID treatmentId);
    @Query("""
        select s from DialysisSession s
        join fetch s.treatment t
        where s.sessionDate between :start and :end
    """)
    List<DialysisSession> findAllWithTreatmentBetween(@Param("start") LocalDateTime start,
                                                      @Param("end") LocalDateTime end);

    // ===== Feature 2 analytics (NEW)

    List<DialysisSession> findByTreatment_PatientIdAndSessionDateBetweenOrderBySessionDateAsc(
            UUID patientId,
            LocalDateTime start,
            LocalDateTime end
    );
    @Query("select s from DialysisSession s where s.weightAfter is not null")
    List<DialysisSession> findAllCompleted();
    @Query("""
select s from DialysisSession s
join s.treatment t
where t.patientId = :patientId
order by s.sessionDate desc
""")
    List<DialysisSession> findHistoryByPatientDesc(@Param("patientId") UUID patientId);
    List<DialysisSession> findByTreatment_IdOrderBySessionDateAsc(UUID treatmentId);}