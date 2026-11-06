package esprit.dialysisservice.dtos.response;


import esprit.dialysisservice.entities.enums.DialysisShift;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionConflictLogDTO {
    private UUID id;
    private UUID treatmentId;
    private UUID patientId;
    private DialysisShift shift;
    private LocalDate sessionDay;
    private Integer used;
    private Integer capacity;
    private LocalDateTime createdAt;
    private UUID createdBy;
}
