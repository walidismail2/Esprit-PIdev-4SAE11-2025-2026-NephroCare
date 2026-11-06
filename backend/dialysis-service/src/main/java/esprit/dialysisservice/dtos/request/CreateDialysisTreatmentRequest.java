package esprit.dialysisservice.dtos.request;
import esprit.dialysisservice.entities.enums.DialysisType;
import esprit.dialysisservice.entities.enums.VascularAccessType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateDialysisTreatmentRequest {
    @NotNull private UUID patientId;
    @NotNull private DialysisType dialysisType;
    @NotNull private VascularAccessType vascularAccessType;

    @NotNull @Positive
    private Double targetDryWeight;

    @NotNull @Min(1) @Max(7)
    private Integer frequencyPerWeek;

    @NotNull @Min(30) @Max(600)
    private Integer prescribedDurationMinutes;

    private LocalDate startDate;
}
