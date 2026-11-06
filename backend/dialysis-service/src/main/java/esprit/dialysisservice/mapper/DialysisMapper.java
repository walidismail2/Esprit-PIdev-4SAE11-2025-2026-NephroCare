package esprit.dialysisservice.mapper;

import esprit.dialysisservice.dtos.response.DialysisSessionResponseDTO;
import esprit.dialysisservice.dtos.response.DialysisTreatmentResponseDTO;
import esprit.dialysisservice.entities.DialysisSession;
import esprit.dialysisservice.entities.DialysisTreatment;
import org.springframework.stereotype.Component;

@Component
public class DialysisMapper {

    public DialysisTreatmentResponseDTO toResponse(DialysisTreatment entity) {
        return DialysisTreatmentResponseDTO.builder()
                .id(entity.getId())
                .patientId(entity.getPatientId())
                .doctorId(entity.getDoctorId())
                .dialysisType(entity.getDialysisType())
                .vascularAccessType(entity.getVascularAccessType())
                .frequencyPerWeek(entity.getFrequencyPerWeek())
                .prescribedDurationMinutes(entity.getPrescribedDurationMinutes())
                .targetDryWeight(entity.getTargetDryWeight())
                .status(entity.getStatus())
                .startDate(entity.getStartDate())
                .build();
    }

    public DialysisSessionResponseDTO toSessionResponse(DialysisSession entity) {
        return DialysisSessionResponseDTO.builder()
                .id(entity.getId())
                .treatmentId(entity.getTreatment() != null ? entity.getTreatment().getId() : null)
                .nurseId(entity.getNurseId())
                .sessionDate(entity.getSessionDate())
                .weightBefore(entity.getWeightBefore())
                .weightAfter(entity.getWeightAfter())
                .ultrafiltrationVolume(entity.getUltrafiltrationVolume())
                .preDialysisUrea(entity.getPreDialysisUrea())
                .postDialysisUrea(entity.getPostDialysisUrea())

                .achievedKtV(entity.getAchievedKtV())

                .urr(entity.getUrr())
                .spKtV(entity.getSpKtV())
                .eKtV(entity.getEKtV())

                .preBloodPressure(entity.getPreBloodPressure())
                .complications(entity.getComplications())
                .build();
    }
}