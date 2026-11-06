package esprit.order_service.service;

import esprit.order_service.dto.DeliveryRequest;
import esprit.order_service.dto.DeliveryResponse;
import esprit.order_service.entity.Delivery;
import esprit.order_service.entity.Enumerations.DeliveryStatus;
import esprit.order_service.entity.Order;
import esprit.order_service.repository.DeliveryRepository;
import esprit.order_service.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DeliveryServiceImpl implements IDeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final OrderRepository    orderRepository;

    @Override
    public DeliveryResponse createDelivery(DeliveryRequest request) {

        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new RuntimeException(
                        "Order not found: " + request.getOrderId()));

        Delivery delivery = Delivery.builder()
                .orderId(order.getId())
                .patientId(order.getPatientId())
                .patientName(order.getPatientName())
                .deliveryAddress(order.getDeliveryAddress())
                .phoneNumber(order.getPhoneNumber())
                .driverName(request.getDriverName())
                .trackingNumber("TRK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .status(DeliveryStatus.SCHEDULED)
                .scheduledAt(request.getScheduledAt() != null
                        ? request.getScheduledAt()
                        : LocalDateTime.now().plusHours(2))
                .notes(request.getNotes())
                .attempts(0)
                .build();

        Delivery saved = deliveryRepository.save(delivery);

        log.info("🚚 Livraison créée : {} | commande: {} | livreur: {}",
                saved.getTrackingNumber(), saved.getOrderId(), saved.getDriverName());

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeliveryResponse> getAllDeliveries() {
        return deliveryRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeliveryResponse> getDeliveriesByPatient(String patientId) {
        return deliveryRepository.findByPatientId(patientId).stream()
                .map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryResponse getDeliveryByOrder(String orderId) {
        Delivery d = deliveryRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException(
                        "No delivery for order: " + orderId));
        return toResponse(d);
    }

    @Override
    public DeliveryResponse updateStatus(String id, DeliveryStatus status) {
        Delivery d = deliveryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Delivery not found: " + id));

        d.setStatus(status);
        if (status == DeliveryStatus.IN_TRANSIT) d.setAttempts(d.getAttempts() + 1);
        if (status == DeliveryStatus.DELIVERED)  d.setDeliveredAt(LocalDateTime.now());

        Delivery saved = deliveryRepository.save(d);
        log.info("🔄 Statut livraison {} → {}", id, status);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryResponse getById(String id) {
        return toResponse(deliveryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Delivery not found: " + id)));
    }

    private DeliveryResponse toResponse(Delivery d) {
        return DeliveryResponse.builder()
                .id(d.getId())
                .orderId(d.getOrderId())
                .patientName(d.getPatientName())
                .deliveryAddress(d.getDeliveryAddress())
                .phoneNumber(d.getPhoneNumber())
                .driverName(d.getDriverName())
                .trackingNumber(d.getTrackingNumber())
                .status(d.getStatus())
                .attempts(d.getAttempts())
                .scheduledAt(d.getScheduledAt())
                .deliveredAt(d.getDeliveredAt())
                .notes(d.getNotes())
                .createdAt(d.getCreatedAt())
                .build();
    }
    @Override
    @Transactional(readOnly = true)
    public List<DeliveryResponse> getDeliveriesByDriver(String driverName) {
        return deliveryRepository.findByDriverName(driverName).stream()
                .map(this::toResponse)
                .toList();
    }
}