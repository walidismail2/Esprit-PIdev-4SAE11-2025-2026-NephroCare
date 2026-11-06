package esprit.pharmacy_service.service;

import esprit.pharmacy_service.dto.StockStatsResponse;
import esprit.pharmacy_service.dto.StockUpdateRequest;
import esprit.pharmacy_service.entity.Enumerations.MovementReason;
import esprit.pharmacy_service.entity.Enumerations.MovementType;
import esprit.pharmacy_service.entity.Medication;
import esprit.pharmacy_service.entity.Prescription;
import esprit.pharmacy_service.entity.StockMovement;
import esprit.pharmacy_service.repository.MedicationRepository;
import esprit.pharmacy_service.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StockServiceImpl implements IStockService {

    private final MedicationRepository    medicationRepository;
    private final StockMovementRepository movementRepository;

    // ════════════════════════════════════════════════════════════════
    // ✅ SERVICE SCHEDULÉ 1 — Suppression automatique des médicaments
    //    expirés (endDate < aujourd'hui)
    //    → Utilise findExpiredWithStock() : 1 seule requête SQL filtrée
    //      au lieu de findAll() + stream().filter() en mémoire
    // ════════════════════════════════════════════════════════════════
    @Scheduled(cron = "0 0 0 * * *")   // chaque jour à 00:00:00
    @Transactional
    public void removeExpiredMedications() {

        log.info("⏰ [SCHEDULER 1] Démarrage : suppression des médicaments expirés...");

        LocalDate today = LocalDate.now();

        // ✅ 1 seule requête SQL ciblée (plus de findAll + filter en mémoire)
        List<Medication> expired = medicationRepository.findExpiredWithStock(today);

        if (expired.isEmpty()) {
            log.info("✅ [SCHEDULER 1] Aucun médicament expiré à traiter.");
            return;
        }

        int count = 0;

        for (Medication med : expired) {

            int qtyBefore = med.getQuantity();

            med.setQuantity(0);
            medicationRepository.save(med);

            StockMovement movement = StockMovement.builder()
                    .medicationId(med.getId())
                    .medicationName(med.getMedicationName())
                    .type(MovementType.OUT)
                    .quantity(qtyBefore)
                    .stockBefore(qtyBefore)
                    .stockAfter(0)
                    .reason(MovementReason.EXPIRED)
                    .notes("Suppression automatique — médicament expiré le " + med.getEndDate())
                    .performedBy("Scheduler")
                    .build();

            movementRepository.save(movement);
            count++;

            log.warn("🗑️ [SCHEDULER 1] Expiré : {} | date: {} | qté retirée: {}",
                    med.getMedicationName(), med.getEndDate(), qtyBefore);
        }

        log.info("✅ [SCHEDULER 1] Terminé — {} médicament(s) expiré(s) traité(s).", count);
    }

    // ════════════════════════════════════════════════════════════════
    // ✅ SERVICE SCHEDULÉ 2 — Réapprovisionnement automatique
    //    des médicaments en stock faible (quantité <= 10)
    //    → Utilise findLowStockNotExpired() : 1 seule requête SQL filtrée
    // ════════════════════════════════════════════════════════════════
    @Scheduled(cron = "0 0 6 * * MON")   // chaque lundi à 06:00:00
    @Transactional
    public void autoRestockLowMedications() {

        log.info("⏰ [SCHEDULER 2] Démarrage : réapprovisionnement des stocks faibles...");

        final int ALERT_THRESHOLD  = 10;
        final int RESTOCK_QUANTITY = 50;

        // ✅ 1 seule requête SQL ciblée (plus de findAll + filter en mémoire)
        List<Medication> lowStock = medicationRepository
                .findLowStockNotExpired(ALERT_THRESHOLD, LocalDate.now());

        if (lowStock.isEmpty()) {
            log.info("✅ [SCHEDULER 2] Aucun médicament en stock faible.");
            return;
        }

        int count = 0;

        for (Medication med : lowStock) {

            int stockBefore = med.getQuantity();
            int stockAfter  = stockBefore + RESTOCK_QUANTITY;

            med.setQuantity(stockAfter);
            medicationRepository.save(med);

            StockMovement movement = StockMovement.builder()
                    .medicationId(med.getId())
                    .medicationName(med.getMedicationName())
                    .type(MovementType.IN)
                    .quantity(RESTOCK_QUANTITY)
                    .stockBefore(stockBefore)
                    .stockAfter(stockAfter)
                    .reason(MovementReason.MANUAL_RESTOCK)
                    .notes("Réapprovisionnement automatique — stock faible (" +
                            stockBefore + " unités restantes)")
                    .performedBy("Scheduler")
                    .build();

            movementRepository.save(movement);
            count++;

            log.info("📦 [SCHEDULER 2] Réappro : {} | {}→{} (+{} unités)",
                    med.getMedicationName(), stockBefore, stockAfter, RESTOCK_QUANTITY);
        }

        log.info("✅ [SCHEDULER 2] Terminé — {} médicament(s) réapprovisionné(s).", count);
    }

    // ════════════════════════════════════════════════════════════════
    // Mise à jour manuelle du stock
    // ════════════════════════════════════════════════════════════════
    @Override
    public Medication updateStock(String medicationId, StockUpdateRequest request) {

        Medication med = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new RuntimeException(
                        "Medication not found: " + medicationId));

        int stockBefore = med.getQuantity() != null ? med.getQuantity() : 0;
        int stockAfter  = stockBefore + request.getQuantityChange();

        if (stockAfter < 0) {
            throw new RuntimeException(
                    "Insufficient stock for '" + med.getMedicationName() + "'. " +
                            "Available: " + stockBefore + ", " +
                            "Required: "  + Math.abs(request.getQuantityChange()));
        }

        med.setQuantity(stockAfter);
        medicationRepository.save(med);

        StockMovement movement = StockMovement.builder()
                .medicationId(medicationId)
                .medicationName(med.getMedicationName())
                .type(request.getQuantityChange() >= 0 ? MovementType.IN : MovementType.OUT)
                .quantity(Math.abs(request.getQuantityChange()))
                .stockBefore(stockBefore)
                .stockAfter(stockAfter)
                .reason(request.getReason() != null
                        ? request.getReason() : MovementReason.ADJUSTMENT)
                .prescriptionId(request.getPrescriptionId())
                .notes(request.getNotes())
                .performedBy(request.getPerformedBy() != null
                        ? request.getPerformedBy() : "Admin")
                .build();

        movementRepository.save(movement);

        log.info("✅ Stock updated: {} | {}→{} | reason: {}",
                med.getMedicationName(), stockBefore, stockAfter, request.getReason());

        return med;
    }

    // ════════════════════════════════════════════════════════════════
    // Décrémentation automatique quand DISPENSED
    // ════════════════════════════════════════════════════════════════
    @Override
    public void decrementStockForPrescription(Prescription prescription) {

        if (prescription.getMedications() == null
                || prescription.getMedications().isEmpty()) {
            log.warn("⚠️ Prescription {} has no medications", prescription.getId());
            return;
        }

        List<String> errors = new ArrayList<>();

        for (Medication prescMed : prescription.getMedications()) {

            Optional<Medication> stockMedOpt = medicationRepository
                    .findByMedicationNameIgnoreCase(prescMed.getMedicationName());

            if (stockMedOpt.isEmpty()) {
                log.warn("⚠️ Medication '{}' not found in global stock",
                        prescMed.getMedicationName());
                continue;
            }

            Medication stockMed       = stockMedOpt.get();
            int        qtyToDecrement = prescMed.getQuantity() != null
                    ? prescMed.getQuantity() : 0;

            if (qtyToDecrement <= 0) continue;

            try {
                StockUpdateRequest req = new StockUpdateRequest();
                req.setQuantityChange(-qtyToDecrement);
                req.setReason(MovementReason.PRESCRIPTION_DISPENSED);
                req.setPrescriptionId(prescription.getId());
                req.setNotes("Auto-decremented — prescription DISPENSED");
                req.setPerformedBy("System");

                updateStock(stockMed.getId(), req);

                log.info("📦 Auto-decrement: {} -{} (prescription {})",
                        prescMed.getMedicationName(), qtyToDecrement, prescription.getId());

            } catch (RuntimeException e) {
                log.error("❌ Stock error for {}: {}", prescMed.getMedicationName(), e.getMessage());
                errors.add(prescMed.getMedicationName() + ": " + e.getMessage());
            }
        }

        if (!errors.isEmpty()) {
            log.error("⚠️ Some medications had insufficient stock: {}", errors);
        }
    }

    // ════════════════════════════════════════════════════════════════
    // Historique des mouvements
    // ════════════════════════════════════════════════════════════════
    @Override
    @Transactional(readOnly = true)
    public List<StockMovement> getMovementsByMedication(String medicationId) {
        return movementRepository.findByMedicationIdOrderByCreatedAtDesc(medicationId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockMovement> getAllMovements() {
        return movementRepository.findAllByOrderByCreatedAtDesc();
    }

    // ════════════════════════════════════════════════════════════════
    // Statistiques globales du stock
    // ════════════════════════════════════════════════════════════════
    @Override
    @Transactional(readOnly = true)
    public StockStatsResponse getStats() {

        List<Medication>    all   = medicationRepository.findAll();
        List<StockMovement> moves = movementRepository.findAll();

        return StockStatsResponse.builder()
                .total(all.size())
                .available(all.stream()
                        .filter(m -> m.getQuantity() != null && m.getQuantity() > 10)
                        .count())
                .low(all.stream()
                        .filter(m -> m.getQuantity() != null
                                && m.getQuantity() > 0
                                && m.getQuantity() <= 10)
                        .count())
                .out(all.stream()
                        .filter(m -> m.getQuantity() == null || m.getQuantity() == 0)
                        .count())
                .totalMovements(moves.size())
                .totalIn(moves.stream()
                        .filter(mv -> mv.getType() == MovementType.IN)
                        .count())
                .totalOut(moves.stream()
                        .filter(mv -> mv.getType() == MovementType.OUT)
                        .count())
                .build();
    }
}