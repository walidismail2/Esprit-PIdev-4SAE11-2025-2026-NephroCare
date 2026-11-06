package esprit.clinicalservice.services;

import esprit.clinicalservice.dtos.TransplantCandidacyDTO;
import esprit.clinicalservice.entities.TransplantCandidacy;
import esprit.clinicalservice.repositories.TransplantCandidacyRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class TransplantCandidacyService {

    private final TransplantCandidacyRepository repository;

    public TransplantCandidacyService(TransplantCandidacyRepository repository) {
        this.repository = repository;
    }

    public TransplantCandidacyDTO createCandidacy(TransplantCandidacyDTO dto, Long createdBy) {
        TransplantCandidacy entity = new TransplantCandidacy();
        entity.setPatientId(dto.getPatientId());
        entity.setStatus(TransplantCandidacy.CandidacyStatus.valueOf(dto.getStatus()));
        entity.setEligibilityScore(dto.getEligibilityScore());
        entity.setEligibilityNotes(dto.getEligibilityNotes());
        entity.setEcdSuitable(dto.getEcdSuitable());
        entity.setLivingDonorSuitable(dto.getLivingDonorSuitable());
        entity.setHlaLevel(TransplantCandidacy.HLASensitization.valueOf(dto.getHlaLevel()));
        entity.setPanelReactiveAntibody(dto.getPanelReactiveAntibody());
        entity.setCardiovascularClearance(dto.getCardiovascularClearance());
        entity.setInfectiousDiseaseCleanance(dto.getInfectiousDiseaseCleanance());
        entity.setPsychologicalClearance(dto.getPsychologicalClearance());
        entity.setSocialSupportAssessment(dto.getSocialSupportAssessment());
        entity.setContraindications(dto.getContraindications());
        entity.setDialysisModality(TransplantCandidacy.DialysisModality.valueOf(dto.getDialysisModality()));
        entity.setWaitlistDate(dto.getWaitlistDate());
        entity.setCreatedBy(createdBy);
        entity.setCreatedAt(LocalDateTime.now());

        TransplantCandidacy saved = repository.save(entity);
        return convertToDTO(saved);
    }

    public TransplantCandidacyDTO updateCandidacy(Long id, TransplantCandidacyDTO dto) {
        Optional<TransplantCandidacy> existing = repository.findById(id);
        if (existing.isEmpty()) {
            throw new RuntimeException("Transplant candidacy not found");
        }

        TransplantCandidacy entity = existing.get();
        entity.setStatus(TransplantCandidacy.CandidacyStatus.valueOf(dto.getStatus()));
        entity.setEligibilityScore(dto.getEligibilityScore());
        entity.setEligibilityNotes(dto.getEligibilityNotes());
        entity.setEcdSuitable(dto.getEcdSuitable());
        entity.setLivingDonorSuitable(dto.getLivingDonorSuitable());
        entity.setHlaLevel(TransplantCandidacy.HLASensitization.valueOf(dto.getHlaLevel()));
        entity.setPanelReactiveAntibody(dto.getPanelReactiveAntibody());
        entity.setCardiovascularClearance(dto.getCardiovascularClearance());
        entity.setInfectiousDiseaseCleanance(dto.getInfectiousDiseaseCleanance());
        entity.setPsychologicalClearance(dto.getPsychologicalClearance());
        entity.setSocialSupportAssessment(dto.getSocialSupportAssessment());
        entity.setContraindications(dto.getContraindications());
        entity.setDialysisModality(TransplantCandidacy.DialysisModality.valueOf(dto.getDialysisModality()));
        entity.setWaitlistDate(dto.getWaitlistDate());
        entity.setUpdatedAt(LocalDateTime.now());

        TransplantCandidacy updated = repository.save(entity);
        return convertToDTO(updated);
    }

    public TransplantCandidacyDTO getCandidacyByPatientId(Long patientId) {
        Optional<TransplantCandidacy> candidacy = repository.findByPatientId(patientId);
        return candidacy.map(this::convertToDTO).orElse(null);
    }

    public TransplantCandidacyDTO getCandidacyById(Long id) {
        Optional<TransplantCandidacy> candidacy = repository.findById(id);
        return candidacy.map(this::convertToDTO).orElse(null);
    }

    public List<TransplantCandidacyDTO> getAllCandidacies() {
        return repository.findAll().stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    public List<TransplantCandidacyDTO> getCandidaciesByStatus(String status) {
        return repository.findByStatus(status).stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    public void deleteCandidacy(Long id) {
        repository.deleteById(id);
    }

    private TransplantCandidacyDTO convertToDTO(TransplantCandidacy entity) {
        TransplantCandidacyDTO dto = new TransplantCandidacyDTO();
        dto.setId(entity.getId());
        dto.setPatientId(entity.getPatientId());
        dto.setStatus(entity.getStatus().name());
        dto.setEligibilityScore(entity.getEligibilityScore());
        dto.setEligibilityNotes(entity.getEligibilityNotes());
        dto.setEcdSuitable(entity.getEcdSuitable());
        dto.setLivingDonorSuitable(entity.getLivingDonorSuitable());
        dto.setHlaLevel(entity.getHlaLevel().name());
        dto.setPanelReactiveAntibody(entity.getPanelReactiveAntibody());
        dto.setCardiovascularClearance(entity.getCardiovascularClearance());
        dto.setInfectiousDiseaseCleanance(entity.getInfectiousDiseaseCleanance());
        dto.setPsychologicalClearance(entity.getPsychologicalClearance());
        dto.setSocialSupportAssessment(entity.getSocialSupportAssessment());
        dto.setContraindications(entity.getContraindications());
        dto.setDialysisModality(entity.getDialysisModality().name());
        dto.setWaitlistDate(entity.getWaitlistDate());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        dto.setCreatedBy(entity.getCreatedBy());
        return dto;
    }
}
