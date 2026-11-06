package esprit.clinicalservice.controllers;

import esprit.clinicalservice.dtos.PreoperativeAssessmentDTO;
import esprit.clinicalservice.services.PreoperativeAssessmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/preoperative-assessment")
public class PreoperativeAssessmentController {

    private final PreoperativeAssessmentService service;

    public PreoperativeAssessmentController(PreoperativeAssessmentService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<PreoperativeAssessmentDTO> createAssessment(
            @Valid @RequestBody PreoperativeAssessmentDTO dto,
            @RequestParam(required = false) Long assessedBy) {
        PreoperativeAssessmentDTO created = service.createAssessment(dto, assessedBy != null ? assessedBy : 0L);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PreoperativeAssessmentDTO> updateAssessment(
            @PathVariable Long id,
            @Valid @RequestBody PreoperativeAssessmentDTO dto) {
        PreoperativeAssessmentDTO updated = service.updateAssessment(id, dto);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<PreoperativeAssessmentDTO> getAssessmentByPatientId(@PathVariable Long patientId) {
        PreoperativeAssessmentDTO assessment = service.getAssessmentByPatientId(patientId);
        if (assessment == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(assessment);
    }

    @GetMapping("/patient/{patientId}/history")
    public ResponseEntity<List<PreoperativeAssessmentDTO>> getAssessmentHistoryByPatientId(@PathVariable Long patientId) {
        List<PreoperativeAssessmentDTO> assessments = service.getAssessmentHistoryByPatientId(patientId);
        return ResponseEntity.ok(assessments);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PreoperativeAssessmentDTO> getAssessmentById(@PathVariable Long id) {
        PreoperativeAssessmentDTO assessment = service.getAssessmentById(id);
        if (assessment == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(assessment);
    }

    @GetMapping
    public ResponseEntity<List<PreoperativeAssessmentDTO>> getAllAssessments() {
        List<PreoperativeAssessmentDTO> assessments = service.getAllAssessments();
        return ResponseEntity.ok(assessments);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<PreoperativeAssessmentDTO>> getAssessmentsByStatus(@PathVariable String status) {
        List<PreoperativeAssessmentDTO> assessments = service.getAssessmentsByStatus(status);
        return ResponseEntity.ok(assessments);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAssessment(@PathVariable Long id) {
        service.deleteAssessment(id);
        return ResponseEntity.noContent().build();
    }
}
