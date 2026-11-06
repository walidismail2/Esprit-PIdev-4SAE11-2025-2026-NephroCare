package esprit.pharmacy_service.entity;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import esprit.pharmacy_service.entity.Enumerations.MovementReason;
import esprit.pharmacy_service.entity.Enumerations.MovementType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "stock_movements")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StockMovement {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String medicationId;

    @Column(nullable = false)
    private String medicationName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MovementType type;

    @Column(nullable = false)
    private Integer quantity;

    private Integer stockBefore;
    private Integer stockAfter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MovementReason reason;

    private String prescriptionId;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    private String performedBy = "System";

    @CreationTimestamp
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
