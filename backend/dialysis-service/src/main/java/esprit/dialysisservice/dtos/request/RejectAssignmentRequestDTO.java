package esprit.dialysisservice.dtos.request;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class RejectAssignmentRequestDTO {
    private String reason;
}