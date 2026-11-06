package esprit.order_service.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OrderItemResponse {
    private String  medicationId;
    private String  medicationName;
    private String  dosage;
    private String  route;
    private Integer quantity;
    private Double  unitPrice;
    private Double  subtotal;
}
