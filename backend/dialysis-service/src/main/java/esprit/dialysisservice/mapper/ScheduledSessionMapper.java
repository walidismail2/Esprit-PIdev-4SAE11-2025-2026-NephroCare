package esprit.dialysisservice.mapper;

import esprit.dialysisservice.dtos.response.ScheduledSessionResponseDTO;
import esprit.dialysisservice.entities.ScheduledSession;
import org.springframework.stereotype.Component;

@Component
public class ScheduledSessionMapper {
    public ScheduledSessionResponseDTO toResponse(ScheduledSession s) {
        return ScheduledSessionResponseDTO.builder()
                .id(s.getId())
                .treatmentId(s.getTreatmentId())
                .nurseId(s.getNurseId())
                .day(s.getDay())
                .shift(s.getShift())
                .status(s.getStatus())
                .sessionId(s.getSessionId())
                .build();
    }
}