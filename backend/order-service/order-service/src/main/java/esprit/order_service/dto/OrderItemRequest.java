package esprit.order_service.dto;

import lombok.Data;

@Data
public class OrderItemRequest {
    private String  medicationId;
    private String  medicationName;
    private String  dosage;
    private String  route;
    private Integer quantity;
}