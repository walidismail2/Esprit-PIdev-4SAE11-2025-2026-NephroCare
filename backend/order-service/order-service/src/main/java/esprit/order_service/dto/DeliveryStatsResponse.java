package esprit.order_service.dto;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DeliveryStatsResponse {

    // ── Compteurs par statut ──────────────────────────
    private long totalDeliveries;
    private long scheduled;
    private long inTransit;
    private long delivered;
    private long failed;
    private long returned;

    // ── Performance ───────────────────────────────────
    private double successRate;       // delivered / total * 100
    private double failureRate;       // failed / total * 100
    private double averageAttempts;   // moyenne du nb de tentatives

    // ── Top livreurs ──────────────────────────────────
    private java.util.List<DriverStat> topDrivers;

    @Data
    @Builder
    public static class DriverStat {
        private String driverName;
        private long   deliveries;
        private long   successes;
        private double successRate;
    }
}