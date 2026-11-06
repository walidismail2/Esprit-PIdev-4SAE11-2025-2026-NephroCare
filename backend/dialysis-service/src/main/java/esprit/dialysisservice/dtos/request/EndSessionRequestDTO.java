package esprit.dialysisservice.dtos.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class EndSessionRequestDTO {

    @NotNull(message = "Weight after required")
    @Positive(message = "Weight after must be positive")
    private Double weightAfter;

    @NotNull(message = "Pre-dialysis urea required")
    @Positive(message = "Pre-dialysis urea must be positive")
    private Double preDialysisUrea;

    @NotNull(message = "Post-dialysis urea required")
    @Positive(message = "Post-dialysis urea must be positive")
    private Double postDialysisUrea;
}
