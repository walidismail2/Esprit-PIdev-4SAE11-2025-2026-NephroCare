package esprit.dialysisservice.dtos.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AlertStatusUpdateDTO {
    private String status; // ACKNOWLEDGED or RESOLVED
}