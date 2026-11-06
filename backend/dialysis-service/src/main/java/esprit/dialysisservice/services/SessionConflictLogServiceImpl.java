package esprit.dialysisservice.services;

import esprit.dialysisservice.dtos.response.SessionConflictLogDTO;
import esprit.dialysisservice.entities.SessionConflictLog;
import esprit.dialysisservice.entities.enums.DialysisShift;
import esprit.dialysisservice.repositories.SessionConflictLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SessionConflictLogServiceImpl implements SessionConflictLogService {

    private final SessionConflictLogRepository repo;

    @Override
    @Transactional
    public void log(UUID treatmentId, UUID patientId, DialysisShift shift, LocalDate sessionDay, int used, int capacity, UUID createdBy) {
        SessionConflictLog row = SessionConflictLog.builder()
                .treatmentId(treatmentId)
                .patientId(patientId)
                .shift(shift)
                .sessionDay(sessionDay)
                .used(used)
                .capacity(capacity)
                .createdAt(LocalDateTime.now())
                .createdBy(createdBy)
                .build();
        repo.save(row);
    }

    @Override
    public List<SessionConflictLogDTO> listAll() {
        return repo.findAllByOrderByCreatedAtDesc().stream().map(this::toDto).toList();
    }

    @Override
    public List<SessionConflictLogDTO> listAfter(LocalDateTime after) {
        return repo.findByCreatedAtAfterOrderByCreatedAtDesc(after).stream().map(this::toDto).toList();
    }

    private SessionConflictLogDTO toDto(SessionConflictLog e) {
        return SessionConflictLogDTO.builder()
                .id(e.getId())
                .treatmentId(e.getTreatmentId())
                .patientId(e.getPatientId())
                .shift(e.getShift())
                .sessionDay(e.getSessionDay())
                .used(e.getUsed())
                .capacity(e.getCapacity())
                .createdAt(e.getCreatedAt())
                .createdBy(e.getCreatedBy())
                .build();
    }
}
