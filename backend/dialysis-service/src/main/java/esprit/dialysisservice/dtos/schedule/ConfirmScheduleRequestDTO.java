package esprit.dialysisservice.dtos.schedule;
import lombok.Data;

import java.util.List;
import java.util.UUID;
@Data
public class ConfirmScheduleRequestDTO {
    private UUID treatmentId;
    private List<ConfirmSlotDTO> slots;
}