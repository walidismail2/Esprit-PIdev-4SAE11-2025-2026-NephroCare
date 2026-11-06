package esprit.order_service.dto;

import esprit.order_service.entity.Enumerations.DeliveryStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class DeliveryResponse {
    private String         id;
    private String         orderId;
    private String         patientName;
    private String         deliveryAddress;
    private String         phoneNumber;
    private String         driverName;
    private String         trackingNumber;
    private DeliveryStatus status;
    private Integer        attempts;
    private LocalDateTime  scheduledAt;
    private LocalDateTime  deliveredAt;
    private String         notes;
    private LocalDateTime  createdAt;
}