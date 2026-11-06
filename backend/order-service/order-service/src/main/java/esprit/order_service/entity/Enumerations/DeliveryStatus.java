package esprit.order_service.entity.Enumerations;

public enum DeliveryStatus {
    SCHEDULED,    // Livraison planifiée
    IN_TRANSIT,   // En cours de transport
    DELIVERED,    // Livrée avec succès
    FAILED,       // Échec de livraison
    RETURNED      // Retournée
}
