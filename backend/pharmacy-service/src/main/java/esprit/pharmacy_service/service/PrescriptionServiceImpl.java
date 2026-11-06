package esprit.pharmacy_service.service;

import esprit.pharmacy_service.entity.Enumerations.PrescriptionStatus;
import esprit.pharmacy_service.entity.Prescription;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import esprit.pharmacy_service.repository.PrescriptionRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j

public class PrescriptionServiceImpl implements IPrescriptionService {

    private final PrescriptionRepository prescriptionRepository;

    private final IStockService stockService;


    @Override
    public Prescription create(Prescription prescription) {
        return prescriptionRepository.save(prescription);
    }

    @Override
    public List<Prescription> findAll() {
        return prescriptionRepository.findAllWithMedications();
    }

    @Override
    public Prescription findById(String id) {
        return prescriptionRepository.findByIdWithMedications(id)
                .orElseThrow(() -> new RuntimeException("Prescription not found"));
    }

    @Override
    @Transactional
    public Prescription updateStatus(String id, PrescriptionStatus status) {
        Prescription p = findById(id);
        PrescriptionStatus oldStatus = p.getStatus();

        p.setStatus(status);
        Prescription saved = prescriptionRepository.save(p);

        // ✅ AJOUTER — décrémentation auto quand passage à DISPENSED
        if (status == PrescriptionStatus.DISPENSED
                && oldStatus != PrescriptionStatus.DISPENSED) {

            log.info("🔄 Prescription {} → DISPENSED. Triggering stock decrement...", id);
            stockService.decrementStockForPrescription(saved);
        }

        return saved;
    }
    @Override
    public void delete(String id) {
        prescriptionRepository.deleteById(id);
    }
    @Override
    public List<Prescription> findByUserId(String userId) {
        return prescriptionRepository.findByUserId(userId);
    }

}
