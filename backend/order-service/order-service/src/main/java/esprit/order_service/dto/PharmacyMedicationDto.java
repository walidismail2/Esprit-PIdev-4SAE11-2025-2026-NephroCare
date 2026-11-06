package esprit.order_service.dto;

import lombok.Data;

@Data
public class PharmacyMedicationDto {
    private String  id;
    private String  medicationName;
    private String  dosage;
    private String  route;
    private Integer quantity;   // stock disponible
    private String  endDate;
}

