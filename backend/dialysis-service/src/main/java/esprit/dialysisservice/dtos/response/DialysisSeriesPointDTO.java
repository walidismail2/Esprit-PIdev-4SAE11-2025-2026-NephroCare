package esprit.dialysisservice.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class DialysisSeriesPointDTO {
    private UUID sessionId;
    private LocalDateTime sessionDate;

    private Double urr;        // %
    private Double spKtV;
    // single pool
    @JsonProperty("eKtV")
    private Double eKtV;       // equilibrated estimate

    // backward compat
    private Double achievedKtV;
}