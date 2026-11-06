package esprit.dialysisservice.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class DialysisSessionResponseDTO {

    private UUID id;
    private UUID treatmentId;
    private UUID nurseId;

    private LocalDateTime sessionDate;

    private Double weightBefore;
    private Double weightAfter;
    private Double ultrafiltrationVolume;

    private Double preDialysisUrea;
    private Double postDialysisUrea;

    // legacy
    private Double achievedKtV;

    // Feature 2
    private Double urr;     // %
    private Double spKtV;
    @JsonProperty("eKtV")
    private Double eKtV;

    private String preBloodPressure;
    private String complications;
}