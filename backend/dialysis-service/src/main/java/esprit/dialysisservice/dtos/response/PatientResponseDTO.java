package esprit.dialysisservice.dtos.response;


import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PatientResponseDTO {
    private String id;
    private String fullName;
    private String email;
}
