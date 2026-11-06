package esprit.dialysisservice.services;

import esprit.dialysisservice.dtos.request.CreateDialysisSessionRequestDTO;
import esprit.dialysisservice.dtos.request.UpdateDialysisSessionRequestDTO;
import esprit.dialysisservice.dtos.response.DialysisSessionResponseDTO;
import esprit.dialysisservice.entities.DialysisSession;
import esprit.dialysisservice.entities.DialysisTreatment;
import esprit.dialysisservice.entities.ScheduledSession;
import esprit.dialysisservice.entities.SystemConfig;
import esprit.dialysisservice.entities.enums.DialysisShift;
import esprit.dialysisservice.entities.enums.ScheduledStatus;
import esprit.dialysisservice.entities.enums.TreatmentStatus;
import esprit.dialysisservice.exceptions.EntityNotFoundException;
import esprit.dialysisservice.mapper.DialysisMapper;
import esprit.dialysisservice.repositories.DialysisSessionRepository;
import esprit.dialysisservice.repositories.DialysisTreatmentRepository;
import esprit.dialysisservice.repositories.ScheduledSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DialysisSessionServiceImpl implements IDialysisSessionService {

    private final DialysisSessionRepository sessionRepository;
    private final DialysisTreatmentRepository treatmentRepository;
    private final ScheduledSessionRepository scheduledSessionRepository;
    private final DialysisMapper mapper;

    private final SystemConfigService systemConfigService;
    private final AlertService alertService;

    private final SessionConflictLogService conflictLogService;

    private final SessionReportService sessionReportService;

    // =========================
    // CREATE (Nurse)
    // =========================
    @Override
    @Transactional
    public DialysisSessionResponseDTO createSession(CreateDialysisSessionRequestDTO dto) {
        ensureRole("ROLE_nurse");

        UUID nurseId = getAuthenticatedUserUuidOrThrow();

        // TODAY ONLY
        LocalDate day = dto.getSessionDay();
        if (day == null) throw new IllegalStateException("Session day required");
        if (!day.equals(LocalDate.now())) throw new IllegalStateException("Sessions can be started for today only.");

        DialysisShift shift = dto.getShift();
        if (shift == null) throw new IllegalStateException("Shift required");

        if (dto.getTreatmentId() == null) throw new IllegalStateException("TreatmentId required");

        // MUST HAVE SCHEDULED SLOT (for this nurse, today, shift)
        ScheduledSession sched = scheduledSessionRepository
                .findFirstByTreatmentIdAndNurseIdAndDayAndShiftAndStatus(
                        dto.getTreatmentId(), nurseId, day, shift, ScheduledStatus.SCHEDULED
                )
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "No scheduled session for you today for this treatment/shift."
                ));

        // NEW RULE: one open session per nurse
        if (sessionRepository.existsByNurseIdAndWeightAfterIsNull(nurseId)) {
            throw new IllegalStateException("You already have an IN-PROGRESS session. End it before starting another.");
        }

        DialysisTreatment treatment = treatmentRepository.findById(dto.getTreatmentId())
                .orElseThrow(() -> new EntityNotFoundException("Treatment not found with ID: " + dto.getTreatmentId()));

        if (treatment.getStatus() != TreatmentStatus.ACTIVE) {
            throw new IllegalStateException("Cannot start session. Treatment status is: " + treatment.getStatus());
        }

        // Only one open session per treatment
        if (sessionRepository.existsByTreatment_IdAndWeightAfterIsNull(treatment.getId())) {
            throw new IllegalStateException("There is already an IN-PROGRESS session for this treatment.");
        }

        // ---- OVERBOOKING CHECK (Config-based) ----
        SystemConfig cfg = systemConfigService.getOrCreate();
        int capacity = cfg.getMaxConcurrentSessionsPerShift();

        LocalDateTime start = shiftStart(cfg, day, shift);
        LocalDateTime end = shiftEnd(cfg, day, shift);

        long used = sessionRepository.countByShiftAndSessionDateBetweenAndWeightAfterIsNull(shift, start, end);

        if (used >= capacity) {
            UUID patientId = treatment.getPatientId();
            conflictLogService.log(treatment.getId(), patientId, shift, day, (int) used, capacity, nurseId);

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Shift full: " + shift + " on " + day + ". Try another shift/day."
            );
        }
        // -----------------------------------------

        DialysisSession session = new DialysisSession();
        session.setTreatment(treatment);

        session.setShift(shift);
        session.setSessionDate(start); // shift start
        session.setNurseId(nurseId);

        session.setWeightBefore(dto.getWeightBefore());
        session.setPreBloodPressure(dto.getPreBloodPressure());
        session.setComplications(dto.getComplications());

        // open session fields
        session.setWeightAfter(null);
        session.setPreDialysisUrea(null);
        session.setPostDialysisUrea(null);
        session.setAchievedKtV(null);
        session.setSpKtV(null);
        session.setEKtV(null);
        session.setUrr(null);
        session.setUltrafiltrationVolume(null);

        DialysisSession saved = sessionRepository.save(session);

        // Link schedule -> started
        sched.setStatus(ScheduledStatus.STARTED);
        sched.setSessionId(saved.getId());
        scheduledSessionRepository.save(sched);

        return mapper.toSessionResponse(saved);
    }
    // =========================
    // UPDATE (Nurse)
    // =========================
    @Override
    @Transactional
    public DialysisSessionResponseDTO updateSession(UUID id, UpdateDialysisSessionRequestDTO dto) {
        ensureRole("ROLE_nurse");

        DialysisSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Session not found with ID: " + id));

        UUID nurseId = getAuthenticatedUserUuidOrThrow();
        if (session.getNurseId() != null && !session.getNurseId().equals(nurseId)) {
            throw new IllegalStateException("You can only update sessions you started.");
        }

        if (session.getWeightAfter() != null) {
            throw new IllegalStateException("Completed sessions cannot be updated.");
        }

        // protect against changing treatment
        if (dto.getTreatmentId() != null && session.getTreatment() != null
                && !session.getTreatment().getId().equals(dto.getTreatmentId())) {
            throw new IllegalStateException("You cannot change the treatment of a session.");
        }

        if (dto.getWeightBefore() == null || dto.getWeightBefore() <= 0) {
            throw new IllegalStateException("weightBefore must be positive.");
        }

        session.setWeightBefore(dto.getWeightBefore());
        session.setPreBloodPressure(dto.getPreBloodPressure());
        session.setComplications(dto.getComplications());

        DialysisSession saved = sessionRepository.save(session);
        return mapper.toSessionResponse(saved);
    }

    // =========================
    // END (Nurse)
    // =========================
    @Override
    @Transactional
    public DialysisSessionResponseDTO endSession(UUID sessionId,
                                                 Double weightAfter,
                                                 Double postDialysisUrea,
                                                 Double preDialysisUrea) {
        ensureRole("ROLE_nurse");

        DialysisSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found with ID: " + sessionId));

        UUID nurseId = getAuthenticatedUserUuidOrThrow();
        if (session.getNurseId() != null && !session.getNurseId().equals(nurseId)) {
            throw new IllegalStateException("You can only end sessions you started.");
        }

        if (session.getWeightAfter() != null) {
            throw new IllegalStateException("Session already completed.");
        }

        if (weightAfter == null || weightAfter <= 0) {
            throw new IllegalStateException("weightAfter must be positive.");
        }
        if (postDialysisUrea == null || postDialysisUrea <= 0) {
            throw new IllegalStateException("postDialysisUrea must be positive.");
        }
        if (preDialysisUrea == null || preDialysisUrea <= 0) {
            throw new IllegalStateException("preDialysisUrea must be positive (required for Kt/V).");
        }

        if (postDialysisUrea >= preDialysisUrea) {
            throw new IllegalStateException("postDialysisUrea must be lower than preDialysisUrea.");
        }

        if (session.getWeightBefore() != null && weightAfter >= session.getWeightBefore()) {
            throw new IllegalStateException("weightAfter must be lower than weightBefore.");
        }

        session.setWeightAfter(weightAfter);
        session.setPreDialysisUrea(preDialysisUrea);
        session.setPostDialysisUrea(postDialysisUrea);

        calculateSessionMetrics(session);

        DialysisSession saved = sessionRepository.save(session);

        scheduledSessionRepository.findBySessionId(saved.getId()).ifPresent(sch -> {
            sch.setStatus(ScheduledStatus.COMPLETED);
            scheduledSessionRepository.save(sch);
        });

        SystemConfig cfg = systemConfigService.getOrCreate();
        sessionReportService.generateAndSave(saved.getId(), nurseId, cfg);

        // NEW: create alerts after report/session finalization
        alertService.createAlertsForCompletedSession(saved.getId());

        return mapper.toSessionResponse(saved);
    }

    private void calculateSessionMetrics(DialysisSession session) {
        Double before = session.getWeightBefore();
        Double after  = session.getWeightAfter();

        // UF (L) assuming kg difference approx liters
        if (before != null && after != null) {
            session.setUltrafiltrationVolume(before - after);
        }

        Double preUrea  = session.getPreDialysisUrea();
        Double postUrea = session.getPostDialysisUrea();

        if (preUrea == null || postUrea == null || preUrea <= 0 || postUrea <= 0 || after == null) {
            // clear computed fields if not computable
            session.setAchievedKtV(null);
            session.setSpKtV(null);
            session.setEKtV(null);
            session.setUrr(null);
            return;
        }

        // URR (%)
        double urr = (1.0 - (postUrea / preUrea)) * 100.0;
        // clamp 0..100
        urr = Math.max(0.0, Math.min(100.0, urr));
        session.setUrr(round2(urr));

        // Treatment duration (minutes)
        Integer durationMinInt = (session.getTreatment() != null)
                ? session.getTreatment().getPrescribedDurationMinutes()
                : null;

        double durationMinutes = (durationMinInt != null) ? durationMinInt.doubleValue() : 240.0;
        double tHours = durationMinutes / 60.0;

        // Daugirdas II spKt/V
        double r = postUrea / preUrea;
        double uf = (session.getUltrafiltrationVolume() != null) ? session.getUltrafiltrationVolume() : 0.0;
        double w  = after;

        double insideLn = r - 0.008 * tHours;
        if (insideLn <= 0) {
            session.setAchievedKtV(null);
            session.setSpKtV(null);
            session.setEKtV(null);
            return;
        }

        double spKtV = -Math.log(insideLn) + (4.0 - 3.5 * r) * (uf / w);
        spKtV = round2(spKtV);

        // Backward compatibility
        session.setAchievedKtV(spKtV);

        // New explicit field
        session.setSpKtV(spKtV);

        // eKt/V (simple rebound estimate)
        // avoid division by zero
        Double eKtV = null;
        if (tHours > 0.0 && spKtV != 0.0) {
            double est = spKtV - (0.6 * spKtV / tHours);
            eKtV = round2(Math.max(0.0, est));
        }
        session.setEKtV(eKtV);
    }

    private Double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    // =========================
    // READ
    // =========================
    @Override
    public DialysisSessionResponseDTO getSessionById(UUID id) {
        return sessionRepository.findById(id)
                .map(mapper::toSessionResponse)
                .orElseThrow(() -> new EntityNotFoundException("Session not found with ID: " + id));
    }

    @Override
    public List<DialysisSessionResponseDTO> getSessionsByTreatment(UUID treatmentId) {
        return sessionRepository.findByTreatment_IdOrderBySessionDateDesc(treatmentId)
                .stream().map(mapper::toSessionResponse).toList();
    }

    @Override
    public List<DialysisSessionResponseDTO> getAllSessions() {
        return sessionRepository.findAll().stream().map(mapper::toSessionResponse).toList();
    }

    // =========================
    // ADMIN HARD DELETE (Scenario 4.2)
    // =========================
    @Override
    public void deleteSession(UUID id) {
        ensureRole("ROLE_admin");
        if (!sessionRepository.existsById(id)) throw new EntityNotFoundException("Session not found with ID: " + id);
        sessionRepository.deleteById(id);
    }

    // =========================
    // Analytics
    // =========================
    @Override
    public List<DialysisSessionResponseDTO> getPatientHistory(UUID patientId) {
        return sessionRepository.findByTreatmentPatientId(patientId)
                .stream().map(mapper::toSessionResponse).toList();
    }

    @Override
    public Double calculateAverageKtV(UUID treatmentId) {
        double avg = sessionRepository.findByTreatment_IdOrderBySessionDateDesc(treatmentId).stream()
                .filter(s -> s.getAchievedKtV() != null)
                .mapToDouble(DialysisSession::getAchievedKtV)
                .average()
                .orElse(0.0);

        return Math.round(avg * 100.0) / 100.0;
    }

    // =========================
    // Shift helpers (Config-based)
    // =========================
    private LocalDateTime shiftStart(SystemConfig cfg, LocalDate day, DialysisShift shift) {
        return switch (shift) {
            case MORNING -> day.atTime(cfg.getMorningStart());
            case AFTERNOON -> day.atTime(cfg.getAfternoonStart());
        };
    }

    private LocalDateTime shiftEnd(SystemConfig cfg, LocalDate day, DialysisShift shift) {
        return switch (shift) {
            case MORNING -> day.atTime(cfg.getMorningEnd());
            case AFTERNOON -> day.atTime(cfg.getAfternoonEnd());
        };
    }

    // =========================
    // Security helpers
    // =========================
    private UUID getAuthenticatedUserUuidOrThrow() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new IllegalStateException("No authentication in security context");

        String sub = auth.getName();
        if (sub == null || sub.isBlank()) throw new IllegalStateException("Cannot extract user id (sub) from token");

        return UUID.fromString(sub);
    }

    private void ensureRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new AccessDeniedException("Forbidden");

        boolean ok = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a != null && a.equalsIgnoreCase(role));

        if (!ok) throw new AccessDeniedException("Forbidden");
    }
}
