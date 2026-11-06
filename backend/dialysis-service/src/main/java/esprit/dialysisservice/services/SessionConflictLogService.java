package esprit.dialysisservice.services;


import esprit.dialysisservice.dtos.response.SessionConflictLogDTO;
import esprit.dialysisservice.entities.enums.DialysisShift;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface SessionConflictLogService {
    void log(UUID treatmentId, UUID patientId, DialysisShift shift, LocalDate sessionDay, int used, int capacity, UUID createdBy);
    List<SessionConflictLogDTO> listAll();
    List<SessionConflictLogDTO> listAfter(LocalDateTime after);
}
