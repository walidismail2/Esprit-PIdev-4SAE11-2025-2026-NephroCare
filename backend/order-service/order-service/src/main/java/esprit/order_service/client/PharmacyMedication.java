package esprit.order_service.client;

import lombok.Data;

@Data
public class PharmacyMedication {
    private String id;
    private String medicationName;
    private String dosage;
    private String route;
    private Integer quantity;
    private Double unitPrice;
}
