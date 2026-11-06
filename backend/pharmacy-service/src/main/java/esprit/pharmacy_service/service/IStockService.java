package esprit.pharmacy_service.service;
import esprit.pharmacy_service.dto.StockStatsResponse;
import esprit.pharmacy_service.dto.StockUpdateRequest;
import esprit.pharmacy_service.entity.Medication;
import esprit.pharmacy_service.entity.Prescription;
import esprit.pharmacy_service.entity.StockMovement;

import java.util.List;

public interface IStockService {
    // Mettre à jour le stock manuellement
    Medication updateStock(String medicationId, StockUpdateRequest request);

    // Décrémenter automatiquement quand prescription → DISPENSED
    void decrementStockForPrescription(Prescription prescription);

    // Historique d'un médicament
    List<StockMovement> getMovementsByMedication(String medicationId);

    // Historique global
    List<StockMovement> getAllMovements();

    // Stats globales du stock
    StockStatsResponse getStats();
}
