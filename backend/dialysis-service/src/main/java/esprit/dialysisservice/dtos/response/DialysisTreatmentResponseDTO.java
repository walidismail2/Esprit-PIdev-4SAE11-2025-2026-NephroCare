package esprit.dialysisservice.dtos.response;

import esprit.dialysisservice.entities.enums.VascularAccessType;
import esprit.dialysisservice.entities.enums.DialysisType;
import esprit.dialysisservice.entities.enums.TreatmentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class DialysisTreatmentResponseDTO {

    private UUID id;
    private UUID patientId;
    private UUID doctorId;
    private String patientName;
    private String doctorName;
    private DialysisType dialysisType;
    private VascularAccessType vascularAccessType;
    private Integer frequencyPerWeek;
    private Integer prescribedDurationMinutes;
    private Double targetDryWeight;
    private TreatmentStatus status;
    private LocalDate startDate;
}
