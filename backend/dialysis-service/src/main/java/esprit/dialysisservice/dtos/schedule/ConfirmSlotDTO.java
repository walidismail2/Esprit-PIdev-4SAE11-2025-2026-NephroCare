package esprit.dialysisservice.dtos.schedule;

import esprit.dialysisservice.entities.enums.DialysisShift;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class ConfirmSlotDTO {
    private LocalDate day;
    private DialysisShift shift;
    private UUID nurseId; // required
}