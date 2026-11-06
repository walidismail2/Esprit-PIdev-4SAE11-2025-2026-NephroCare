package esprit.order_service.controller;

import esprit.order_service.dto.OrderRequest;
import esprit.order_service.dto.OrderResponse;
import esprit.order_service.entity.Enumerations.OrderStatus;
import esprit.order_service.service.IOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final IOrderService orderService;

    // POST /api/orders — Créer une commande
    @PostMapping
    public ResponseEntity<OrderResponse> create(@RequestBody OrderRequest request) {
        return ResponseEntity.ok(orderService.createOrder(request));
    }

    // GET /api/orders — Toutes les commandes (back-office)
    @GetMapping
    public ResponseEntity<List<OrderResponse>> getAll() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    // GET /api/orders/{id}
    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    // GET /api/orders/patient/{patientId} — Commandes d'un patient
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<OrderResponse>> getByPatient(
            @PathVariable String patientId) {
        return ResponseEntity.ok(orderService.getOrdersByPatient(patientId));
    }

    // PUT /api/orders/{id}/status — Changer le statut
    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(
            @PathVariable String id,
            @RequestParam OrderStatus status) {
        return ResponseEntity.ok(orderService.updateStatus(id, status));
    }

    // DELETE /api/orders/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        orderService.deleteOrder(id);
        return ResponseEntity.noContent().build();
    }

    // GET /api/orders/stats — Compteurs par statut
    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        return ResponseEntity.ok(java.util.Map.of(
                "pending",    orderService.countByStatus(OrderStatus.PENDING),
                "confirmed",  orderService.countByStatus(OrderStatus.CONFIRMED),
                "processing", orderService.countByStatus(OrderStatus.PROCESSING),
                "shipped",    orderService.countByStatus(OrderStatus.SHIPPED),
                "delivered",  orderService.countByStatus(OrderStatus.DELIVERED),
                "cancelled",  orderService.countByStatus(OrderStatus.CANCELLED)
        ));
    }
}