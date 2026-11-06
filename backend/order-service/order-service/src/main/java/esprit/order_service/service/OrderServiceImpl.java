package esprit.order_service.service;

import esprit.order_service.client.PharmacyClient;
import esprit.order_service.client.PharmacyMedication;
import esprit.order_service.dto.OrderItemResponse;
import esprit.order_service.dto.OrderRequest;
import esprit.order_service.dto.OrderResponse;
import esprit.order_service.entity.Delivery;
import esprit.order_service.entity.Order;
import esprit.order_service.entity.OrderItem;
import esprit.order_service.entity.Enumerations.OrderStatus;
import esprit.order_service.repository.DeliveryRepository;
import esprit.order_service.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OrderServiceImpl implements IOrderService {

    private final OrderRepository    orderRepository;
    private final DeliveryRepository deliveryRepository;
    private final PharmacyClient     pharmacyClient;

    // ════════════════════════════════════════════════════════════════
    // ✅ SCHEDULER 1 — Annulation automatique des commandes PENDING
    //    depuis plus de 24h sans confirmation.
    //
    //    Besoin métier : une commande non confirmée en 24h est
    //    probablement orpheline (patient déconnecté, bug réseau...).
    //    On l'annule automatiquement pour libérer les ressources
    //    et éviter des livraisons fantômes.
    //    Tourne toutes les heures.
    // ════════════════════════════════════════════════════════════════
    @Scheduled(cron = "0 0 * * * *")   // toutes les heures
    @Transactional
    public void cancelStalePendingOrders() {

        log.info("⏰ [SCHEDULER 1] Annulation des commandes PENDING trop anciennes...");

        LocalDateTime cutoff = LocalDateTime.now().minusHours(24);

        // 1 seule requête SQL ciblée — pas de findAll() en mémoire
        List<Order> stale = orderRepository.findPendingOrdersOlderThan(cutoff);

        if (stale.isEmpty()) {
            log.info("✅ [SCHEDULER 1] Aucune commande obsolète.");
            return;
        }

        int count = 0;

        for (Order order : stale) {
            order.setStatus(OrderStatus.CANCELLED);
            orderRepository.save(order);
            count++;
            log.warn("🚫 [SCHEDULER 1] Commande annulée (inactivité 24h) : {} | patient: {}",
                    order.getId(), order.getPatientName());
        }

        log.info("✅ [SCHEDULER 1] {} commande(s) annulée(s).", count);
    }

    // ════════════════════════════════════════════════════════════════
    // ✅ SCHEDULER 2 — Confirmation automatique des commandes PENDING
    //    en attente depuis plus de 10 minutes (et moins de 24h).
    //
    //    Besoin métier : une commande PENDING depuis plus de 10 min
    //    est considérée stable (le patient ne l'a pas annulée).
    //    Elle passe automatiquement en CONFIRMED pour déclencher
    //    la préparation sans intervention manuelle du pharmacien.
    //    Les commandes > 24h sont exclues car traitées par SCHEDULER 1.
    //    Tourne toutes les 30 minutes.
    // ════════════════════════════════════════════════════════════════
    @Scheduled(cron = "0 0/30 * * * *")   // toutes les 30 minutes
    @Transactional
    public void autoConfirmPendingOrders() {

        log.info("⏰ [SCHEDULER 2] Confirmation automatique des commandes en attente...");

        // Fenêtre : créées entre 10 minutes et 24 heures (borne basse exclusive)
        LocalDateTime confirmCutoff = LocalDateTime.now().minusMinutes(10);
        LocalDateTime cancelCutoff  = LocalDateTime.now().minusHours(24);

        List<Order> pending = orderRepository.findPendingOrdersBetween(confirmCutoff, cancelCutoff);

        if (pending.isEmpty()) {
            log.info("✅ [SCHEDULER 2] Aucune commande à confirmer.");
            return;
        }

        int confirmed = 0;

        for (Order order : pending) {
            order.setStatus(OrderStatus.CONFIRMED);
            orderRepository.save(order);
            confirmed++;
            log.info("✅ [SCHEDULER 2] Commande confirmée : {} | patient: {}",
                    order.getId(), order.getPatientName());
        }

        log.info("✅ [SCHEDULER 2] Terminé — {} commande(s) confirmée(s).", confirmed);
    }

    // ════════════════════════════════════════════════════════════════
    // Créer une commande
    // ════════════════════════════════════════════════════════════════
    @Override
    public OrderResponse createOrder(OrderRequest request) {

        // 1. Construire l'entité Order d'abord (nécessaire pour la relation @ManyToOne)
        Order order = Order.builder()
                .patientId(request.getPatientId())
                .patientName(request.getPatientName())
                .prescriptionId(request.getPrescriptionId())
                .deliveryAddress(request.getDeliveryAddress())
                .phoneNumber(request.getPhoneNumber())
                .notes(request.getNotes())
                .totalAmount(0.0)
                .status(OrderStatus.PENDING)
                .items(new ArrayList<>())
                .build();

        // 2. Construire les items en les liant à la commande
        List<OrderItem> items = request.getItems().stream()
                .map(req -> {
                    PharmacyMedication medication = pharmacyClient.getMedication(req.getMedicationId());
                    if (medication == null) {
                        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Pharmacy did not return medication " + req.getMedicationId());
                    }
                    if (medication.getUnitPrice() == null) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Medication " + medication.getMedicationName() + " has no unit price");
                    }
                    int available = medication.getQuantity() == null ? 0 : medication.getQuantity();
                    int requested = req.getQuantity() == null ? 0 : req.getQuantity();
                    if (requested <= 0) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be greater than zero");
                    }
                    if (available < requested) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT,
                                "Insufficient stock for " + medication.getMedicationName() + ". Available: " + available);
                    }
                    double unitPrice = medication.getUnitPrice();
                    return OrderItem.builder()
                            .medicationId(req.getMedicationId())
                            .medicationName(medication.getMedicationName() != null ? medication.getMedicationName() : req.getMedicationName())
                            .dosage(medication.getDosage() != null ? medication.getDosage() : req.getDosage())
                            .route(medication.getRoute() != null ? medication.getRoute() : req.getRoute())
                            .quantity(requested)
                            .unitPrice(unitPrice)
                            .subtotal(requested * unitPrice)
                            .order(order)
                            .build();
                })
                .toList();

        order.getItems().addAll(items);

        // 3. Calculer le total
        double total = items.stream()
                .mapToDouble(OrderItem::getSubtotal)
                .sum();
        order.setTotalAmount(total);

        // 4. Persister, then reserve stock
        Order saved = orderRepository.save(order);
        for (OrderItem item : saved.getItems()) {
            pharmacyClient.decrementStock(item.getMedicationId(), item.getQuantity(), saved.getId());
        }

        log.info("📦 Commande créée : {} | patient: {} | total: {}€",
                saved.getId(), saved.getPatientName(), saved.getTotalAmount());

        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════════
    // Lire toutes les commandes
    // ════════════════════════════════════════════════════════════════
    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders() {
        // Fix N+1 : JOIN FETCH des items en une seule requête
        return orderRepository.findAllWithItems().stream()
                .map(o -> toResponse(o, getTrackingNumber(o.getId())))
                .toList();
    }

    // ════════════════════════════════════════════════════════════════
    // Lire les commandes d'un patient
    // ════════════════════════════════════════════════════════════════
    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByPatient(String patientId) {
        // Fix N+1 : JOIN FETCH des items en une seule requête
        return orderRepository.findByPatientIdWithItems(patientId).stream()
                .map(o -> toResponse(o, getTrackingNumber(o.getId())))
                .toList();
    }

    // ════════════════════════════════════════════════════════════════
    // Lire une commande par ID
    // ════════════════════════════════════════════════════════════════
    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(String id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
        return toResponse(order, getTrackingNumber(id));
    }

    // ════════════════════════════════════════════════════════════════
    // Mettre à jour le statut d'une commande
    // ════════════════════════════════════════════════════════════════
    @Override
    public OrderResponse updateStatus(String id, OrderStatus status) {

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));

        // Bloquer les transitions invalides
        if (order.getStatus() == OrderStatus.CANCELLED
                || order.getStatus() == OrderStatus.DELIVERED) {
            throw new RuntimeException(
                    "Impossible de modifier le statut d'une commande "
                            + order.getStatus() + ".");
        }

        OrderStatus previous = order.getStatus();
        order.setStatus(status);
        Order saved = orderRepository.save(order);

        log.info("🔄 Statut commande {} : {} → {}", id, previous, status);

        return toResponse(saved, getTrackingNumber(id));
    }

    // ════════════════════════════════════════════════════════════════
    // Supprimer une commande
    // ════════════════════════════════════════════════════════════════
    @Override
    public void deleteOrder(String id) {
        if (!orderRepository.existsById(id)) {
            throw new RuntimeException("Order not found: " + id);
        }
        orderRepository.deleteById(id);
        log.info("🗑️ Commande supprimée : {}", id);
    }

    // ════════════════════════════════════════════════════════════════
    // Compter les commandes par statut
    // ════════════════════════════════════════════════════════════════
    @Override
    @Transactional(readOnly = true)
    public long countByStatus(OrderStatus status) {
        return orderRepository.countByStatus(status);
    }

    // ════════════════════════════════════════════════════════════════
    // Helpers privés
    // ════════════════════════════════════════════════════════════════

    /**
     * Récupère le numéro de tracking de la livraison liée à la commande.
     * Retourne null si aucune livraison n'existe encore.
     */
    private String getTrackingNumber(String orderId) {
        return deliveryRepository.findByOrderId(orderId)
                .map(Delivery::getTrackingNumber)
                .orElse(null);
    }

    /**
     * Convertit une entité Order en OrderResponse DTO.
     */
    private OrderResponse toResponse(Order o, String trackingNumber) {

        List<OrderItemResponse> itemResponses = o.getItems().stream()
                .map(i -> OrderItemResponse.builder()
                        .medicationId(i.getMedicationId())
                        .medicationName(i.getMedicationName())
                        .dosage(i.getDosage())
                        .route(i.getRoute())
                        .quantity(i.getQuantity())
                        .unitPrice(i.getUnitPrice())
                        .subtotal(i.getSubtotal())
                        .build())
                .toList();

        return OrderResponse.builder()
                .id(o.getId())
                .patientId(o.getPatientId())
                .patientName(o.getPatientName())
                .prescriptionId(o.getPrescriptionId())
                .status(o.getStatus())
                .deliveryAddress(o.getDeliveryAddress())
                .phoneNumber(o.getPhoneNumber())
                .notes(o.getNotes())
                .totalAmount(o.getTotalAmount())
                .items(itemResponses)
                .trackingNumber(trackingNumber)
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .build();
    }
}