package esprit.order_service.dto;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GlobalStatsResponse {
    private OrderStatsResponse    orders;
    private DeliveryStatsResponse deliveries;
}

