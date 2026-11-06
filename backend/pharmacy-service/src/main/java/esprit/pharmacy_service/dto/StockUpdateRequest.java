package esprit.pharmacy_service.dto;
import esprit.pharmacy_service.entity.Enumerations.MovementReason;
import lombok.Data;

@Data
public class StockUpdateRequest {
    private Integer quantityChange;   // positif = entrée, négatif = sortie
    private MovementReason reason;
    private String prescriptionId;    // null si manuel
    private String notes;
    private String performedBy;
}
