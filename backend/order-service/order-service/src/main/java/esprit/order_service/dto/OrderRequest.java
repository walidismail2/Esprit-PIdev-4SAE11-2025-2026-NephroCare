package esprit.order_service.dto;

import lombok.Data;
import java.util.List;

@Data
public class OrderRequest {
    private String               patientId;
    private String               patientName;
    private String               prescriptionId;   // optionnel
    private String               deliveryAddress;
    private String               phoneNumber;
    private String               notes;
    private List<OrderItemRequest> items;
}
