package esprit.order_service.entity.Enumerations;

public enum OrderStatus {
    PENDING,      // Commande créée, en attente de validation
    CONFIRMED,    // Validée par la pharmacie
    PROCESSING,   // En cours de préparation
    SHIPPED,      // Expédiée
    DELIVERED,    // Livrée
    CANCELLED     // Annulée
}
