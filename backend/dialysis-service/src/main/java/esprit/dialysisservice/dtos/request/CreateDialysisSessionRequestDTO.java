package esprit.dialysisservice.dtos.request;


import esprit.dialysisservice.entities.enums.DialysisShift;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateDialysisSessionRequestDTO {

    @NotNull(message = "Treatment ID required")
    private UUID treatmentId;

    @NotNull(message = "Weight before required")
    @Positive(message = "Weight before must be positive")
    private Double weightBefore;

    @Pattern(regexp = "\\d{2,3}/\\d{2,3}", message = "Blood pressure must be like 120/80")
    private String preBloodPressure;

    @Size(max = 255, message = "Complications too long")
    private String complications;

    @NotNull(message = "Shift required")
    private DialysisShift shift;

    @NotNull(message = "Session day required")
    private LocalDate sessionDay;
}
