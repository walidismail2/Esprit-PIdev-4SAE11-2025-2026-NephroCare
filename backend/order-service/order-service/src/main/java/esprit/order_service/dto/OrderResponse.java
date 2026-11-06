package esprit.order_service.dto;

import esprit.order_service.entity.Enumerations.OrderStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class OrderResponse {
    private String          id;
    private String          patientId;
    private String          patientName;
    private String          prescriptionId;
    private OrderStatus     status;
    private String          deliveryAddress;
    private String          phoneNumber;
    private String          notes;
    private Double          totalAmount;
    private List<OrderItemResponse> items;
    private String          trackingNumber;   // depuis Delivery
    private LocalDateTime   createdAt;
    private LocalDateTime   updatedAt;
}