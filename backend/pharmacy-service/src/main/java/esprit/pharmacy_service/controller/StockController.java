package esprit.pharmacy_service.controller;
import esprit.pharmacy_service.dto.StockStatsResponse;
import esprit.pharmacy_service.dto.StockUpdateRequest;
import esprit.pharmacy_service.entity.Medication;
import esprit.pharmacy_service.entity.StockMovement;
import esprit.pharmacy_service.repository.MedicationRepository;
import esprit.pharmacy_service.service.IStockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stock")
@RequiredArgsConstructor
public class StockController {

    private final IStockService stockService;

    private final MedicationRepository medicationRepository;
    // ── GET /api/stock/medications ───────────────
    @GetMapping("/medications")
    public ResponseEntity<List<Medication>> getAllMedications() {
        return ResponseEntity.ok(medicationRepository.findAll());
    }

    // ── POST /api/stock/medications ──────────────
    @PostMapping("/medications")
    public ResponseEntity<Medication> createMedication(@RequestBody Medication medication) {
        return ResponseEntity.ok(medicationRepository.save(medication));
    }

    // ── PUT /api/stock/medications/{id} ──────────
    @PutMapping("/medications/{id}")
    public ResponseEntity<Medication> updateMedication(
            @PathVariable String id,
            @RequestBody Medication medication) {
        Medication existing = medicationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Not found"));
        existing.setMedicationName(medication.getMedicationName());
        existing.setDosage(medication.getDosage());
        existing.setFrequency(medication.getFrequency());
        existing.setRoute(medication.getRoute());
        existing.setDuration(medication.getDuration());
        existing.setQuantity(medication.getQuantity());
        existing.setUnitPrice(medication.getUnitPrice());
        existing.setStartDate(medication.getStartDate());
        existing.setEndDate(medication.getEndDate());
        return ResponseEntity.ok(medicationRepository.save(existing));
    }

    // ── DELETE /api/stock/medications/{id} ───────
    @DeleteMapping("/medications/{id}")
    public ResponseEntity<Void> deleteMedication(@PathVariable String id) {
        medicationRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
    // ── PATCH /api/stock/medications/{id} ───────
    // Ajuster le stock manuellement (restock, ajustement, expiration)
    @PatchMapping("/medications/{id}")
    public ResponseEntity<Medication> updateStock(
            @PathVariable String id,
            @RequestBody StockUpdateRequest request) {
        return ResponseEntity.ok(stockService.updateStock(id, request));
    }

    // ── GET /api/stock/movements ─────────────────
    // Historique global de tous les mouvements
    @GetMapping("/movements")
    public ResponseEntity<List<StockMovement>> getAllMovements() {
        return ResponseEntity.ok(stockService.getAllMovements());
    }

    // ── GET /api/stock/movements/medication/{id} ─
    // Historique d'un médicament spécifique
    @GetMapping("/movements/medication/{id}")
    public ResponseEntity<List<StockMovement>> getMovementsByMedication(
            @PathVariable String id) {
        return ResponseEntity.ok(stockService.getMovementsByMedication(id));
    }

    // ── GET /api/stock/stats ─────────────────────
    // Statistiques globales du stock
    @GetMapping("/stats")
    public ResponseEntity<StockStatsResponse> getStats() {
        return ResponseEntity.ok(stockService.getStats());
    }
}
