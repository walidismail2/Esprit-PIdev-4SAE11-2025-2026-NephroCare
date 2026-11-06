package esprit.order_service.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "order_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonBackReference
    private Order order;

    // ID du médicament dans pharmacy-service
    @Column(nullable = false)
    private String medicationId;

    @Column(nullable = false)
    private String medicationName;

    private String dosage;
    private String route;

    @Column(nullable = false)
    private Integer quantity;

    // Prix unitaire (récupéré depuis pharmacy-service via Feign)
    @Builder.Default
    private Double unitPrice = 0.0;

    // Sous-total = quantity * unitPrice
    @Builder.Default
    private Double subtotal = 0.0;
}
