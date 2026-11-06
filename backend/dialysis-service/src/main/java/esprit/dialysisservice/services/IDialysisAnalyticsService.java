package esprit.dialysisservice.services;

import esprit.dialysisservice.dtos.response.DialysisSeriesPointDTO;
import esprit.dialysisservice.dtos.response.PatientWeeklyAdequacyDTO;

import java.util.List;
import java.util.UUID;

public interface IDialysisAnalyticsService {

    List<DialysisSeriesPointDTO> getTreatmentSeries(UUID treatmentId, int limit);

    List<PatientWeeklyAdequacyDTO> getPatientWeeklyAdequacy(UUID patientId, int weeks);
}