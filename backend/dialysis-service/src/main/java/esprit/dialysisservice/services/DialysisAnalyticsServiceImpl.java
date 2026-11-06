package esprit.dialysisservice.services;

import esprit.dialysisservice.dtos.response.DialysisSeriesPointDTO;
import esprit.dialysisservice.dtos.response.PatientWeeklyAdequacyDTO;
import esprit.dialysisservice.entities.DialysisSession;
import esprit.dialysisservice.entities.SystemConfig;
import esprit.dialysisservice.repositories.DialysisSessionRepository;
import esprit.dialysisservice.repositories.SystemConfigRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DialysisAnalyticsServiceImpl implements IDialysisAnalyticsService {

    private final DialysisSessionRepository sessionRepository;
    private final SystemConfigRepository systemConfigRepository;

    private static final double DEFAULT_KTV_THRESHOLD = 1.2;
    private static final double DEFAULT_URR_THRESHOLD = 65.0; // common adequacy target

    @Override
    @Transactional(readOnly = true)
    public List<DialysisSeriesPointDTO> getTreatmentSeries(UUID treatmentId, int limit) {
        int safeLimit = Math.max(1, Math.min(limit <= 0 ? 20 : limit, 200));

        // asc for time-series; then keep last N
        List<DialysisSession> allAsc = sessionRepository.findByTreatment_IdOrderBySessionDateAsc(treatmentId);

        if (allAsc.isEmpty()) return List.of();

        List<DialysisSession> lastN = allAsc.size() <= safeLimit
                ? allAsc
                : allAsc.subList(allAsc.size() - safeLimit, allAsc.size());

        return lastN.stream()
                .map(s -> DialysisSeriesPointDTO.builder()
                        .sessionId(s.getId())
                        .sessionDate(s.getSessionDate())
                        .urr(s.getUrr())
                        .spKtV(s.getSpKtV())
                        .eKtV(s.getEKtV())
                        .achievedKtV(s.getAchievedKtV())
                        .build()
                )
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PatientWeeklyAdequacyDTO> getPatientWeeklyAdequacy(UUID patientId, int weeks) {
        int safeWeeks = Math.max(1, Math.min(weeks <= 0 ? 8 : weeks, 52));

        // Determine thresholds
        SystemConfig cfg = systemConfigRepository.findById(1L).orElse(null);
        double ktvThreshold = (cfg != null && cfg.getKtvAlertThreshold() != null)
                ? cfg.getKtvAlertThreshold()
                : DEFAULT_KTV_THRESHOLD;

        double urrThreshold = DEFAULT_URR_THRESHOLD;

        LocalDate today = LocalDate.now();
        LocalDate thisWeekStart = startOfWeekMonday(today);

        // We return weeks in chronological order (oldest -> newest)
        List<PatientWeeklyAdequacyDTO> out = new ArrayList<>();

        for (int i = safeWeeks - 1; i >= 0; i--) {
            LocalDate weekStart = thisWeekStart.minusWeeks(i);
            LocalDate weekEnd = weekStart.plusDays(6);

            LocalDateTime startDt = weekStart.atStartOfDay();
            LocalDateTime endDt = weekEnd.atTime(LocalTime.MAX);

            List<DialysisSession> sessions = sessionRepository
                    .findByTreatment_PatientIdAndSessionDateBetweenOrderBySessionDateAsc(patientId, startDt, endDt);

            int count = sessions.size();

            Double avgURR = avgNullable(sessions.stream().map(DialysisSession::getUrr).toList());
            Double avgSp = avgNullable(sessions.stream().map(DialysisSession::getSpKtV).toList());
            Double avgE = avgNullable(sessions.stream().map(DialysisSession::getEKtV).toList());

            double adequacyPct = 0.0;
            if (count > 0) {
                long ok = sessions.stream()
                        .filter(s -> s.getSpKtV() != null && s.getUrr() != null)
                        .filter(s -> s.getSpKtV() >= ktvThreshold && s.getUrr() >= urrThreshold)
                        .count();
                adequacyPct = round2((ok * 100.0) / count);
            }

            out.add(PatientWeeklyAdequacyDTO.builder()
                    .weekStart(weekStart)
                    .weekEnd(weekEnd)
                    .sessionsCount(count)
                    .avgURR(avgURR)
                    .avgSpKtV(avgSp)
                    .avgEKtV(avgE)
                    .adequacyPct(adequacyPct)
                    .ktvThreshold(round2(ktvThreshold))
                    .urrThreshold(round2(urrThreshold))
                    .build());
        }

        return out;
    }

    private LocalDate startOfWeekMonday(LocalDate d) {
        return d.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    private Double avgNullable(List<Double> values) {
        List<Double> ok = values.stream().filter(Objects::nonNull).toList();
        if (ok.isEmpty()) return null;
        double avg = ok.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        return round2(avg);
    }

    private Double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}