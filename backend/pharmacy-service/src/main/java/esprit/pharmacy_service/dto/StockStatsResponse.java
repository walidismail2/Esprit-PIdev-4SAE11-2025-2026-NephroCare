package esprit.pharmacy_service.dto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockStatsResponse {
    private long total;
    private long available;   // qty > 10
    private long low;         // 1 <= qty <= 10
    private long out;         // qty == 0
    private long totalMovements;
    private long totalIn;
    private long totalOut;
}
