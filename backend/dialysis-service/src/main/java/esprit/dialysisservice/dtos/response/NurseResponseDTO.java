package esprit.dialysisservice.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class NurseResponseDTO {
    private String id;
    private String fullName;
    private String email;
}
