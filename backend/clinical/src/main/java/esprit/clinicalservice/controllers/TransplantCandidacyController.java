package esprit.clinicalservice.controllers;

import esprit.clinicalservice.dtos.TransplantAiRecommendationEnvelopeDTO;
import esprit.clinicalservice.dtos.TransplantCandidacyDTO;
import esprit.clinicalservice.services.TransplantAiRecommendationService;
import esprit.clinicalservice.services.TransplantCandidacyService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transplant-candidacy")
public class TransplantCandidacyController {

    private final TransplantCandidacyService service;
    private final ObjectProvider<TransplantAiRecommendationService> aiRecommendationServiceProvider;

    public TransplantCandidacyController(
            TransplantCandidacyService service,
            ObjectProvider<TransplantAiRecommendationService> aiRecommendationServiceProvider
    ) {
        this.service = service;
        this.aiRecommendationServiceProvider = aiRecommendationServiceProvider;
    }

    @PostMapping
    public ResponseEntity<TransplantCandidacyDTO> createCandidacy(
            @Valid @RequestBody TransplantCandidacyDTO dto,
            @RequestParam(required = false) Long createdBy) {
        TransplantCandidacyDTO created = service.createCandidacy(dto, createdBy != null ? createdBy : 0L);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransplantCandidacyDTO> updateCandidacy(
            @PathVariable Long id,
            @Valid @RequestBody TransplantCandidacyDTO dto) {
        TransplantCandidacyDTO updated = service.updateCandidacy(id, dto);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<TransplantCandidacyDTO> getCandidacyByPatientId(@PathVariable Long patientId) {
        TransplantCandidacyDTO candidacy = service.getCandidacyByPatientId(patientId);
        if (candidacy == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(candidacy);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransplantCandidacyDTO> getCandidacyById(@PathVariable Long id) {
        TransplantCandidacyDTO candidacy = service.getCandidacyById(id);
        if (candidacy == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(candidacy);
    }

    @GetMapping
    public ResponseEntity<List<TransplantCandidacyDTO>> getAllCandidacies() {
        List<TransplantCandidacyDTO> candidacies = service.getAllCandidacies();
        return ResponseEntity.ok(candidacies);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<TransplantCandidacyDTO>> getCandidaciesByStatus(@PathVariable String status) {
        List<TransplantCandidacyDTO> candidacies = service.getCandidaciesByStatus(status);
        return ResponseEntity.ok(candidacies);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCandidacy(@PathVariable Long id) {
        service.deleteCandidacy(id);
        return ResponseEntity.noContent().build();
    }

@PostMapping("/{id}/ai-recommendation")
    public ResponseEntity<TransplantAiRecommendationEnvelopeDTO> generateAiRecommendation(@PathVariable Long id) {
        TransplantAiRecommendationService aiService = aiRecommendationServiceProvider.getIfAvailable();
        if (aiService == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
        return ResponseEntity.ok(aiService.generateRecommendation(id));
    }
}
