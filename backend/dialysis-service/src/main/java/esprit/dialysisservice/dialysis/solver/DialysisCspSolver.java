package esprit.dialysisservice.dialysis.solver;


import esprit.dialysisservice.dialysis.solver.SolverModels.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

public class DialysisCspSolver {

    /**
     * Solve for a plan of exactly `sessionsToSchedule` sessions within horizon.
     *
     * If availableNurseIds is empty => solver does NOT bind nurse, only chooses day+shift.
     * If not empty => solver chooses (day,shift,nurse) and respects "one open session per nurse" rule
     * using existingSessions.
     */
    public SolverResult solve(SolverRequest req, int sessionsToSchedule) {
        List<Violation> pre = preCheck(req, sessionsToSchedule);
        if (!pre.isEmpty()) return SolverResult.fail(pre);

        // Build fast indexes from existing sessions
        Index idx = new Index(req);

        // Candidate variables = choose sessionsToSchedule slots.
        // Domain = (day, shift, nurse?) for each session.
        List<Candidate> domain = buildDomain(req, idx);

        // Heuristic: prefer weekdays and morning, and earlier days.
        domain.sort(Comparator
                .comparing((Candidate c) -> c.day)
                .thenComparing(c -> c.shift == Shift.MORNING ? 0 : 1)
                .thenComparing(c -> nurseScore(c.nurseId, idx), Comparator.reverseOrder())
        );

        // Backtracking
        List<ProposedSlot> best = new ArrayList<>();
        int[] bestScore = new int[] { Integer.MIN_VALUE };

        backtrack(req, idx, domain, sessionsToSchedule, new ArrayList<>(), best, bestScore);

        if (!best.isEmpty()) return SolverResult.ok(best);

        // If nothing found => produce explanation
        return SolverResult.fail(explainInfeasibility(req, idx, sessionsToSchedule));
    }

    // ===================== Pre-checks =====================

    private List<Violation> preCheck(SolverRequest req, int sessionsToSchedule) {
        List<Violation> v = new ArrayList<>();

        if (!req.treatment.active) {
            v.add(new Violation(ConstraintType.TREATMENT_MUST_BE_ACTIVE, "Treatment is not ACTIVE."));
            return v;
        }

        if (sessionsToSchedule <= 0) {
            v.add(new Violation(ConstraintType.PATIENT_WEEKLY_FREQUENCY, "sessionsToSchedule must be > 0."));
            return v;
        }

        LocalDate today = LocalDate.now();
        if (req.horizonEnd.isBefore(today)) {
            v.add(new Violation(ConstraintType.SESSION_DAY_NOT_IN_PAST, "Horizon is entirely in the past."));
            return v;
        }

        boolean openForTreatment = req.existingSessions.stream()
                .anyMatch(s -> s.open && req.treatment.treatmentId.equals(s.treatmentId));
        if (openForTreatment) {
            v.add(new Violation(ConstraintType.TREATMENT_ONLY_ONE_OPEN_SESSION, "An open session already exists for this treatment."));
            return v;
        }

        return v;
    }

    // ===================== Domain building =====================

    private List<Candidate> buildDomain(SolverRequest req, Index idx) {
        LocalDate today = LocalDate.now();
        LocalDate start = req.horizonStart.isBefore(today) ? today : req.horizonStart;

        List<LocalDate> days = start.datesUntil(req.horizonEnd.plusDays(1)).collect(Collectors.toList());

        boolean assignNurse = !req.availableNurseIds.isEmpty();
        List<Candidate> domain = new ArrayList<>();

        for (LocalDate d : days) {
            for (Shift sh : SolverModels.allShifts()) {
                if (!assignNurse) {
                    domain.add(new Candidate(d, sh, null));
                    continue;
                }
                for (String nurseId : req.availableNurseIds) {
                    domain.add(new Candidate(d, sh, nurseId));
                }
            }
        }

        // Filter domain by hard constraints that don't depend on "chosen set size"
        return domain.stream()
                .filter(c -> !idx.isPatientBookedSameDay(req.treatment.patientId, c.day))
                .filter(c -> idx.capacityRemaining(c.day, c.shift, req.system.maxConcurrentSessionsPerShift) > 0)
                .filter(c -> c.nurseId == null || !idx.nurseHasOpenSession(c.nurseId))
                .collect(Collectors.toList());
    }

    // ===================== Backtracking =====================

    private void backtrack(
            SolverRequest req,
            Index idx,
            List<Candidate> domain,
            int targetCount,
            List<Candidate> chosen,
            List<ProposedSlot> best,
            int[] bestScore
    ) {
        if (chosen.size() == targetCount) {
            int score = scorePlan(chosen);
            if (score > bestScore[0]) {
                bestScore[0] = score;
                best.clear();
                for (Candidate c : chosen) best.add(new ProposedSlot(c.day, c.shift, c.nurseId));
            }
            return;
        }

        // Bound: if remaining domain slots can't fill target
        int remaining = targetCount - chosen.size();
        if (domain.size() < remaining) return;

        // Choose next variable by "most constrained" day preference: enforce spacing roughly
        // We simply iterate candidates; pruning prevents duplicates and capacity issues.
        for (int i = 0; i < domain.size(); i++) {
            Candidate cand = domain.get(i);

            // Prevent duplicate same-day sessions for patient inside proposed plan
            if (chosen.stream().anyMatch(c -> c.day.equals(cand.day))) continue;

            // Respect capacity for the proposed set
            if (idx.capacityRemainingWithProposed(cand.day, cand.shift, req.system.maxConcurrentSessionsPerShift, chosen) <= 0)
                continue;

            // Nurse overlap constraint (if nurse assigned): one session per nurse per day+shift and also open-session prechecked
            if (cand.nurseId != null) {
                boolean nurseAlreadyInSameShift = chosen.stream().anyMatch(c ->
                        cand.nurseId.equals(c.nurseId) && cand.day.equals(c.day) && cand.shift == c.shift
                );
                if (nurseAlreadyInSameShift) continue;
            }

            // Spacing heuristic: discourage consecutive days if frequency low
            if (!spacingOk(req.treatment.frequencyPerWeek, chosen, cand.day)) {
                // soft prune: allow but later; implement as low-score instead of skip
            }

            chosen.add(cand);

            // Recurse with reduced domain: must keep order and avoid reusing same slot
            List<Candidate> nextDomain = domain.subList(i + 1, domain.size());
            backtrack(req, idx, nextDomain, targetCount, chosen, best, bestScore);

            chosen.remove(chosen.size() - 1);
        }
    }

    // ===================== Scoring / heuristics =====================

    private int scorePlan(List<Candidate> plan) {
        // Higher score is better.
        // Prefer: Mon/Wed/Fri style spacing, weekdays over weekend, mornings over afternoons.
        int score = 0;

        List<LocalDate> days = plan.stream().map(c -> c.day).sorted().toList();

        for (Candidate c : plan) {
            if (c.shift == Shift.MORNING) score += 3;
            if (c.day.getDayOfWeek() == DayOfWeek.SATURDAY || c.day.getDayOfWeek() == DayOfWeek.SUNDAY) score -= 2;
        }

        // spacing: reward gaps ~2 days
        for (int i = 1; i < days.size(); i++) {
            long gap = java.time.temporal.ChronoUnit.DAYS.between(days.get(i - 1), days.get(i));
            if (gap == 2) score += 5;
            else if (gap == 1) score += 1;
            else if (gap >= 3) score += 2;
            else score -= 3;
        }

        return score;
    }

    private boolean spacingOk(int freqPerWeek, List<Candidate> chosen, LocalDate nextDay) {
        if (freqPerWeek >= 4) return true; // dense schedule allowed
        if (chosen.isEmpty()) return true;

        LocalDate last = chosen.stream().map(c -> c.day).max(LocalDate::compareTo).orElse(null);
        if (last == null) return true;
        long gap = java.time.temporal.ChronoUnit.DAYS.between(last, nextDay);
        return gap >= 1;
    }

    private int nurseScore(String nurseId, Index idx) {
        if (nurseId == null) return 0;
        // Prefer nurses that are not already heavily booked (simple proxy: count sessions)
        return -idx.sessionsByNurse.getOrDefault(nurseId, List.of()).size();
    }

    // ===================== Infeasibility explanation =====================

    private List<Violation> explainInfeasibility(SolverRequest req, Index idx, int sessionsToSchedule) {
        List<Violation> out = new ArrayList<>();

        // Horizon capacity total
        int totalCap = 0;
        LocalDate today = LocalDate.now();
        LocalDate start = req.horizonStart.isBefore(today) ? today : req.horizonStart;
        for (LocalDate d = start; !d.isAfter(req.horizonEnd); d = d.plusDays(1)) {
            for (Shift sh : SolverModels.allShifts()) {
                int rem = idx.capacityRemaining(d, sh, req.system.maxConcurrentSessionsPerShift);
                totalCap += Math.max(0, rem);
            }
        }

        if (totalCap < sessionsToSchedule) {
            out.add(new Violation(
                    ConstraintType.CAPACITY_PER_SHIFT_DAY,
                    "Not enough remaining capacity in horizon to schedule " + sessionsToSchedule + " session(s). Remaining capacity=" + totalCap + "."
            ));
        }

        // Patient already booked too often in horizon (same-day conflicts)
        long patientDaysBooked = idx.sessionsByPatientDayKey.stream()
                .filter(k -> k.startsWith(req.treatment.patientId + "|"))
                .count();
        if (patientDaysBooked > 0) {
            out.add(new Violation(
                    ConstraintType.PATIENT_NO_DOUBLE_BOOKING_SAME_DAY,
                    "Patient already has sessions booked on some days inside the horizon."
            ));
        }

        // Nurse open session block (if nurses used)
        if (!req.availableNurseIds.isEmpty()) {
            boolean allBlocked = req.availableNurseIds.stream().allMatch(idx::nurseHasOpenSession);
            if (allBlocked) {
                out.add(new Violation(
                        ConstraintType.NURSE_ONLY_ONE_OPEN_SESSION,
                        "All available nurses currently have an open session."
                ));
            }
        }

        if (out.isEmpty()) {
            out.add(new Violation(ConstraintType.PATIENT_WEEKLY_FREQUENCY, "No feasible plan found with current constraints in the selected horizon."));
        }
        return out;
    }

    // ===================== Internal structures =====================

    private static final class Candidate {
        final LocalDate day;
        final Shift shift;
        final String nurseId;

        Candidate(LocalDate day, Shift shift, String nurseId) {
            this.day = day;
            this.shift = shift;
            this.nurseId = nurseId;
        }
    }

    private static final class Index {
        final Map<String, List<ExistingSession>> sessionsByNurse = new HashMap<>();
        final Map<String, Integer> countByDayShift = new HashMap<>();
        final Set<String> sessionsByPatientDayKey = new HashSet<>();
        final Set<String> nurseWithOpenSession = new HashSet<>();

        Index(SolverRequest req) {
            for (ExistingSession s : req.existingSessions) {
                if (s.nurseId != null) sessionsByNurse.computeIfAbsent(s.nurseId, k -> new ArrayList<>()).add(s);

                String key = dayShiftKey(s.day, s.shift);
                countByDayShift.put(key, countByDayShift.getOrDefault(key, 0) + 1);

                sessionsByPatientDayKey.add(patientDayKey(s.patientId, s.day));

                if (s.open && s.nurseId != null) nurseWithOpenSession.add(s.nurseId);
            }
        }

        boolean nurseHasOpenSession(String nurseId) {
            return nurseWithOpenSession.contains(nurseId);
        }

        boolean isPatientBookedSameDay(String patientId, LocalDate day) {
            return sessionsByPatientDayKey.contains(patientDayKey(patientId, day));
        }

        int capacityRemaining(LocalDate day, Shift shift, int max) {
            String key = dayShiftKey(day, shift);
            int used = countByDayShift.getOrDefault(key, 0);
            return max - used;
        }

        int capacityRemainingWithProposed(LocalDate day, Shift shift, int max, List<Candidate> proposed) {
            int used = max - capacityRemaining(day, shift, max);
            long extra = proposed.stream().filter(c -> c.day.equals(day) && c.shift == shift).count();
            return max - (used + (int) extra);
        }

        static String dayShiftKey(LocalDate day, Shift shift) {
            return day + "|" + shift.name();
        }

        static String patientDayKey(String patientId, LocalDate day) {
            return patientId + "|" + day;
        }
    }
}