package esprit.dialysisservice.dtos.request;

import esprit.dialysisservice.entities.enums.DialysisType;
import esprit.dialysisservice.entities.enums.VascularAccessType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class UpdateDialysisTreatmentRequest {

    private DialysisType dialysisType;
    private VascularAccessType vascularAccessType;

    @Positive(message="Target dry weight must be > 0")
    private Double targetDryWeight;

    @Min(value = 1, message = "Frequency must be between 1 and 7")
    @Max(value = 7, message = "Frequency must be between 1 and 7")
    private Integer frequencyPerWeek;

    @Min(value = 30, message = "Duration must be between 30 and 600 minutes")
    @Max(value = 600, message = "Duration must be between 30 and 600 minutes")
    private Integer prescribedDurationMinutes;
}
