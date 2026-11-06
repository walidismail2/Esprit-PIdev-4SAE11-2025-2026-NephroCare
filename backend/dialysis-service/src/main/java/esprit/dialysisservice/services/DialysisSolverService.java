package esprit.dialysisservice.services;

import esprit.dialysisservice.dialysis.solver.DialysisCspSolver;
import esprit.dialysisservice.dialysis.solver.SolverModels;
import esprit.dialysisservice.dtos.solver.ProposedSlotDTO;
import esprit.dialysisservice.dtos.solver.SolverSuggestResponseDTO;
import esprit.dialysisservice.dtos.solver.ViolationDTO;
import esprit.dialysisservice.entities.DialysisSession;
import esprit.dialysisservice.entities.DialysisTreatment;
import esprit.dialysisservice.entities.SystemConfig;
import esprit.dialysisservice.entities.enums.DialysisShift;
import esprit.dialysisservice.repositories.DialysisSessionRepository;
import esprit.dialysisservice.repositories.DialysisTreatmentRepository;
import esprit.dialysisservice.repositories.SystemConfigRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.*;

@Service
public class DialysisSolverService {

    private final DialysisTreatmentRepository treatmentRepository;
    private final DialysisSessionRepository sessionRepository;
    private final SystemConfigRepository systemConfigRepository;

    private final DialysisCspSolver solver = new DialysisCspSolver();

    public DialysisSolverService(
            DialysisTreatmentRepository treatmentRepository,
            DialysisSessionRepository sessionRepository,
            SystemConfigRepository systemConfigRepository
    ) {
        this.treatmentRepository = treatmentRepository;
        this.sessionRepository = sessionRepository;
        this.systemConfigRepository = systemConfigRepository;
    }

    @Transactional(readOnly = true)
    public SolverSuggestResponseDTO suggest(UUID treatmentId,
                                            LocalDate from,
                                            LocalDate to,
                                            int count,
                                            List<UUID> nurseIds) {

        if (treatmentId == null) throw new ResponseStatusException(BAD_REQUEST, "treatmentId is required");
        if (from == null || to == null) throw new ResponseStatusException(BAD_REQUEST, "from/to are required");
        if (to.isBefore(from)) throw new ResponseStatusException(BAD_REQUEST, "to must be >= from");
        if (count <= 0) throw new ResponseStatusException(BAD_REQUEST, "count must be > 0");

        DialysisTreatment treatment = treatmentRepository.findById(treatmentId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Treatment not found"));

        if (treatment.getStatus() == null || !"ACTIVE".equalsIgnoreCase(treatment.getStatus().name())) {
            throw new ResponseStatusException(CONFLICT, "Treatment must be ACTIVE to solve");
        }

        SystemConfig cfg = systemConfigRepository.findById(1L)
                .orElseThrow(() -> new ResponseStatusException(INTERNAL_SERVER_ERROR, "SystemConfig id=1 not found"));

        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay().minusNanos(1);
        List<DialysisSession> existing = sessionRepository.findAllWithTreatmentBetween(start, end);

        SolverModels.TreatmentRules tr = new SolverModels.TreatmentRules(
                treatment.getId().toString(),
                treatment.getPatientId() != null ? treatment.getPatientId().toString() : null,
                true,
                safeInt(treatment.getFrequencyPerWeek(), 0)
        );

        if (tr.patientId == null) {
            throw new ResponseStatusException(CONFLICT, "Treatment has no patientId (cannot solve)");
        }

        SolverModels.SystemRules sr = new SolverModels.SystemRules(cfg.getMaxConcurrentSessionsPerShift());

        List<SolverModels.ExistingSession> ex = existing.stream()
                .filter(s -> s.getTreatment() != null)
                .filter(s -> s.getTreatment().getId() != null)
                .filter(s -> !treatmentId.equals(s.getTreatment().getId())) // important: exclude same treatment when re-suggesting
                .map(this::toExistingSession)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        List<String> nurseIdStrings = (nurseIds == null ? List.<UUID>of() : nurseIds).stream()
                .filter(Objects::nonNull)
                .map(UUID::toString)
                .collect(Collectors.toList());

        SolverModels.SolverRequest req = new SolverModels.SolverRequest(
                tr,
                sr,
                ex,
                from,
                to,
                nurseIdStrings
        );

        SolverModels.SolverResult res = solver.solve(req, count);

        SolverSuggestResponseDTO dto = new SolverSuggestResponseDTO();
        dto.setFeasible(res.feasible);

        if (res.feasible) {
            List<ProposedSlotDTO> plan = res.plan.stream()
                    .map(p -> new ProposedSlotDTO(
                            p.day,
                            toShiftEnum(p.shift),
                            p.nurseId == null ? null : UUID.fromString(p.nurseId)
                    ))
                    .toList();
            dto.setPlan(plan);
            dto.setViolations(List.of());
        } else {
            List<ViolationDTO> violations = res.violations.stream()
                    .map(v -> new ViolationDTO(v.type, v.message))
                    .toList();
            dto.setPlan(List.of());
            dto.setViolations(violations);
        }

        return dto;
    }

    private SolverModels.ExistingSession toExistingSession(DialysisSession s) {
        if (s == null) return null;
        if (s.getTreatment() == null) return null;
        if (s.getSessionDate() == null) return null;
        if (s.getShift() == null) return null;

        String patientId = s.getTreatment().getPatientId() != null
                ? s.getTreatment().getPatientId().toString()
                : null;

        if (patientId == null) return null;

        LocalDate day = s.getSessionDate().toLocalDate();

        return new SolverModels.ExistingSession(
                s.getId() != null ? s.getId().toString() : null,
                s.getTreatment().getId() != null ? s.getTreatment().getId().toString() : null,
                patientId,
                s.getNurseId() != null ? s.getNurseId().toString() : null,
                day,
                toSolverShift(s.getShift()),
                s.getWeightAfter() == null
        );
    }

    private SolverModels.Shift toSolverShift(DialysisShift shift) {
        return shift == DialysisShift.MORNING
                ? SolverModels.Shift.MORNING
                : SolverModels.Shift.AFTERNOON;
    }

    private DialysisShift toShiftEnum(SolverModels.Shift shift) {
        return shift == SolverModels.Shift.MORNING
                ? DialysisShift.MORNING
                : DialysisShift.AFTERNOON;
    }

    private int safeInt(Integer v, int def) {
        return v == null ? def : v;
    }
}