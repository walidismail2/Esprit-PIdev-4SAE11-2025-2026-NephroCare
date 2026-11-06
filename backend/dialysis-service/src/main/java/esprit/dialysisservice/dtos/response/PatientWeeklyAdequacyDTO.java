package esprit.dialysisservice.dtos.response;


import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class PatientWeeklyAdequacyDTO {
    private LocalDate weekStart;     // Monday
    private LocalDate weekEnd;       // Sunday

    private int sessionsCount;

    private Double avgURR;
    private Double avgSpKtV;
    private Double avgEKtV;

    // % of sessions meeting thresholds
    private Double adequacyPct;

    // threshold used
    private Double ktvThreshold;
    private Double urrThreshold;
}