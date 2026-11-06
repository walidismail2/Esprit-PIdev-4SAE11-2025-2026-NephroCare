package esprit.order_service.controller;

import esprit.order_service.dto.DeliveryRequest;
import esprit.order_service.dto.DeliveryResponse;
import esprit.order_service.entity.Enumerations.DeliveryStatus;
import esprit.order_service.service.IDeliveryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deliveries")
@RequiredArgsConstructor
public class DeliveryController {

    private final IDeliveryService deliveryService;

    // POST /api/deliveries
    @PostMapping
    public ResponseEntity<DeliveryResponse> create(@RequestBody DeliveryRequest request) {
        return ResponseEntity.ok(deliveryService.createDelivery(request));
    }

    // GET /api/deliveries
    @GetMapping
    public ResponseEntity<List<DeliveryResponse>> getAll() {
        return ResponseEntity.ok(deliveryService.getAllDeliveries());
    }

    // ✅ ROUTES FIXES EN PREMIER — avant /{id} pour éviter les conflits

    // GET /api/deliveries/by-driver?driverName=walid
    @GetMapping("/by-driver")
    public ResponseEntity<List<DeliveryResponse>> getByDriver(
            @RequestParam String driverName) {
        return ResponseEntity.ok(deliveryService.getDeliveriesByDriver(driverName));
    }

    // GET /api/deliveries/order/{orderId}
    @GetMapping("/order/{orderId}")
    public ResponseEntity<DeliveryResponse> getByOrder(@PathVariable String orderId) {
        return ResponseEntity.ok(deliveryService.getDeliveryByOrder(orderId));
    }

    // GET /api/deliveries/patient/{patientId}
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<DeliveryResponse>> getByPatient(
            @PathVariable String patientId) {
        return ResponseEntity.ok(deliveryService.getDeliveriesByPatient(patientId));
    }

    // PUT /api/deliveries/{id}/status
    @PutMapping("/{id}/status")
    public ResponseEntity<DeliveryResponse> updateStatus(
            @PathVariable String id,
            @RequestParam DeliveryStatus status) {
        return ResponseEntity.ok(deliveryService.updateStatus(id, status));
    }

    // ✅ /{id} EN DERNIER — sinon il capte tout ce qui précède
    @GetMapping("/{id}")
    public ResponseEntity<DeliveryResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(deliveryService.getById(id));
    }
}