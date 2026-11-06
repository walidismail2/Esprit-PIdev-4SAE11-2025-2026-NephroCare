package esprit.dialysisservice.dialysis.solver;


import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public final class SolverModels {

    private SolverModels() {}

    public enum Shift { MORNING, AFTERNOON }

    public static final class ExistingSession {
        public final String sessionId;
        public final String treatmentId;
        public final String patientId;
        public final String nurseId;
        public final LocalDate day;
        public final Shift shift;
        public final boolean open;

        public ExistingSession(
                String sessionId,
                String treatmentId,
                String patientId,
                String nurseId,
                LocalDate day,
                Shift shift,
                boolean open
        ) {
            this.sessionId = sessionId;
            this.treatmentId = treatmentId;
            this.patientId = patientId;
            this.nurseId = nurseId;
            this.day = day;
            this.shift = shift;
            this.open = open;
        }
    }

    public static final class TreatmentRules {
        public final String treatmentId;
        public final String patientId;
        public final boolean active;
        public final int frequencyPerWeek;

        public TreatmentRules(String treatmentId, String patientId, boolean active, int frequencyPerWeek) {
            this.treatmentId = treatmentId;
            this.patientId = patientId;
            this.active = active;
            this.frequencyPerWeek = frequencyPerWeek;
        }
    }

    public static final class SystemRules {
        public final int maxConcurrentSessionsPerShift;

        public SystemRules(int maxConcurrentSessionsPerShift) {
            if (maxConcurrentSessionsPerShift <= 0) throw new IllegalArgumentException("maxConcurrentSessionsPerShift must be > 0");
            this.maxConcurrentSessionsPerShift = maxConcurrentSessionsPerShift;
        }
    }

    public static final class SolverRequest {
        public final TreatmentRules treatment;
        public final SystemRules system;
        public final List<ExistingSession> existingSessions;

        public final LocalDate horizonStart;     // inclusive
        public final LocalDate horizonEnd;       // inclusive

        public final List<String> availableNurseIds; // nurses allowed to be assigned (can be empty => solver returns slots without nurse)

        public SolverRequest(
                TreatmentRules treatment,
                SystemRules system,
                List<ExistingSession> existingSessions,
                LocalDate horizonStart,
                LocalDate horizonEnd,
                List<String> availableNurseIds
        ) {
            this.treatment = Objects.requireNonNull(treatment);
            this.system = Objects.requireNonNull(system);
            this.existingSessions = existingSessions == null ? List.of() : List.copyOf(existingSessions);
            this.horizonStart = Objects.requireNonNull(horizonStart);
            this.horizonEnd = Objects.requireNonNull(horizonEnd);
            if (horizonEnd.isBefore(horizonStart)) throw new IllegalArgumentException("horizonEnd < horizonStart");
            this.availableNurseIds = availableNurseIds == null ? List.of() : List.copyOf(availableNurseIds);
        }
    }

    public static final class ProposedSlot {
        public final LocalDate day;
        public final Shift shift;
        public final String nurseId; // may be null if solver is not assigning nurses

        public ProposedSlot(LocalDate day, Shift shift, String nurseId) {
            this.day = day;
            this.shift = shift;
            this.nurseId = nurseId;
        }
    }

    public static final class Violation {
        public final ConstraintType type;
        public final String message;

        public Violation(ConstraintType type, String message) {
            this.type = type;
            this.message = message;
        }
    }

    public static final class SolverResult {
        public final boolean feasible;
        public final List<ProposedSlot> plan;       // if feasible
        public final List<Violation> violations;    // if infeasible or partial

        public SolverResult(boolean feasible, List<ProposedSlot> plan, List<Violation> violations) {
            this.feasible = feasible;
            this.plan = plan == null ? List.of() : List.copyOf(plan);
            this.violations = violations == null ? List.of() : List.copyOf(violations);
        }

        public static SolverResult ok(List<ProposedSlot> plan) {
            return new SolverResult(true, plan, List.of());
        }

        public static SolverResult fail(List<Violation> violations) {
            return new SolverResult(false, List.of(), violations);
        }
    }

    public static List<Shift> allShifts() {
        List<Shift> s = new ArrayList<>();
        s.add(Shift.MORNING);
        s.add(Shift.AFTERNOON);
        return s;
    }
}