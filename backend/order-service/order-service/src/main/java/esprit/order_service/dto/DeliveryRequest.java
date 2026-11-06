package esprit.order_service.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class DeliveryRequest {
    private String        orderId;
    private String        driverName;
    private LocalDateTime scheduledAt;
    private String        notes;
}