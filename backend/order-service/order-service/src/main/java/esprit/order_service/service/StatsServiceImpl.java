package esprit.order_service.service;
import esprit.order_service.dto.DeliveryStatsResponse;
import esprit.order_service.dto.GlobalStatsResponse;
import esprit.order_service.dto.OrderStatsResponse;
import esprit.order_service.entity.Enumerations.OrderStatus;
import esprit.order_service.repository.DeliveryRepository;
import esprit.order_service.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatsServiceImpl implements IStatsService {

    private final OrderRepository    orderRepository;
    private final DeliveryRepository deliveryRepository;

    // ════════════════════════════════════════════════
    // Statistiques commandes
    // ════════════════════════════════════════════════
    @Override
    public OrderStatsResponse getOrderStats() {

        long total      = orderRepository.count();
        long pending    = orderRepository.countByStatus(OrderStatus.PENDING);
        long confirmed  = orderRepository.countByStatus(OrderStatus.CONFIRMED);
        long processing = orderRepository.countByStatus(OrderStatus.PROCESSING);
        long shipped    = orderRepository.countByStatus(OrderStatus.SHIPPED);
        long delivered  = orderRepository.countByStatus(OrderStatus.DELIVERED);
        long cancelled  = orderRepository.countByStatus(OrderStatus.CANCELLED);

        double revenue      = orderRepository.sumRevenueDelivered();
        double avgValue     = orderRepository.avgOrderValue();

        // Taux calculés
        double deliveryRate     = total > 0 ? (delivered  * 100.0 / total) : 0;
        double cancellationRate = total > 0 ? (cancelled  * 100.0 / total) : 0;
        double confirmationRate = total > 0
                ? ((confirmed + processing + shipped + delivered) * 100.0 / total)
                : 0;

        return OrderStatsResponse.builder()
                .totalOrders(total)
                .pending(pending)
                .confirmed(confirmed)
                .processing(processing)
                .shipped(shipped)
                .delivered(delivered)
                .cancelled(cancelled)
                .deliveryRate(round(deliveryRate))
                .cancellationRate(round(cancellationRate))
                .confirmationRate(round(confirmationRate))
                .totalRevenue(round(revenue))
                .averageOrderValue(round(avgValue))
                .build();
    }

    // ════════════════════════════════════════════════
    // Statistiques livraisons
    // ════════════════════════════════════════════════
    @Override
    public DeliveryStatsResponse getDeliveryStats() {

        long total = deliveryRepository.count();

        // Compteurs par statut depuis la requête JPQL groupée
        Map<String, Long> statusMap = new HashMap<>();
        for (Object[] row : deliveryRepository.countGroupedByStatus()) {
            statusMap.put(row[0].toString(), (Long) row[1]);
        }

        long scheduled  = statusMap.getOrDefault("SCHEDULED",  0L);
        long inTransit  = statusMap.getOrDefault("IN_TRANSIT", 0L);
        long delivered  = statusMap.getOrDefault("DELIVERED",  0L);
        long failed     = statusMap.getOrDefault("FAILED",     0L);
        long returned   = statusMap.getOrDefault("RETURNED",   0L);

        double avgAttempts  = deliveryRepository.avgAttempts();
        double successRate  = total > 0 ? (delivered * 100.0 / total) : 0;
        double failureRate  = total > 0 ? (failed    * 100.0 / total) : 0;

        // ── Top livreurs ──────────────────────────────
        // Map : driverName → total livraisons
        Map<String, Long> totalByDriver = new HashMap<>();
        for (Object[] row : deliveryRepository.countByDriver()) {
            totalByDriver.put((String) row[0], (Long) row[1]);
        }

        // Map : driverName → livraisons réussies
        Map<String, Long> successByDriver = new HashMap<>();
        for (Object[] row : deliveryRepository.countDeliveredByDriver()) {
            successByDriver.put((String) row[0], (Long) row[1]);
        }

        List<DeliveryStatsResponse.DriverStat> topDrivers = new ArrayList<>();
        totalByDriver.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)   // Top 5
                .forEach(e -> {
                    String name    = e.getKey();
                    long   tot     = e.getValue();
                    long   success = successByDriver.getOrDefault(name, 0L);
                    double rate    = tot > 0 ? (success * 100.0 / tot) : 0;
                    topDrivers.add(DeliveryStatsResponse.DriverStat.builder()
                            .driverName(name)
                            .deliveries(tot)
                            .successes(success)
                            .successRate(round(rate))
                            .build());
                });

        return DeliveryStatsResponse.builder()
                .totalDeliveries(total)
                .scheduled(scheduled)
                .inTransit(inTransit)
                .delivered(delivered)
                .failed(failed)
                .returned(returned)
                .successRate(round(successRate))
                .failureRate(round(failureRate))
                .averageAttempts(round(avgAttempts))
                .topDrivers(topDrivers)
                .build();
    }

    // ════════════════════════════════════════════════
    // Dashboard global (les deux en un seul appel)
    // ════════════════════════════════════════════════
    @Override
    public GlobalStatsResponse getGlobalStats() {
        return GlobalStatsResponse.builder()
                .orders(getOrderStats())
                .deliveries(getDeliveryStats())
                .build();
    }

    // ── Helper ────────────────────────────────────────
    private double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
