package esprit.order_service.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OrderStatsResponse {

    // ── Compteurs par statut ──────────────────────────
    private long totalOrders;
    private long pending;
    private long confirmed;
    private long processing;
    private long shipped;
    private long delivered;
    private long cancelled;

    // ── Taux (%) ──────────────────────────────────────
    private double deliveryRate;      // delivered / total * 100
    private double cancellationRate;  // cancelled / total * 100
    private double confirmationRate;  // confirmed+processing+shipped+delivered / total * 100

    // ── Financier ─────────────────────────────────────
    private double totalRevenue;      // somme totalAmount des commandes DELIVERED
    private double averageOrderValue; // moyenne totalAmount toutes commandes
}