package esprit.order_service.controller;

import esprit.order_service.dto.DeliveryStatsResponse;
import esprit.order_service.dto.GlobalStatsResponse;
import esprit.order_service.dto.OrderStatsResponse;
import esprit.order_service.service.IStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final IStatsService statsService;

    // GET /api/stats/orders     — stats commandes seules
    @GetMapping("/orders")
    public ResponseEntity<OrderStatsResponse> orderStats() {
        return ResponseEntity.ok(statsService.getOrderStats());
    }

    // GET /api/stats/deliveries — stats livraisons seules
    @GetMapping("/deliveries")
    public ResponseEntity<DeliveryStatsResponse> deliveryStats() {
        return ResponseEntity.ok(statsService.getDeliveryStats());
    }

    // GET /api/stats/global     — tout en un seul appel (dashboard)
    @GetMapping("/global")
    public ResponseEntity<GlobalStatsResponse> globalStats() {
        return ResponseEntity.ok(statsService.getGlobalStats());
    }
}