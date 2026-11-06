package esprit.dialysisservice.controllers;

import esprit.dialysisservice.dtos.SuspendedTreatmentAuditDTO;
import esprit.dialysisservice.dtos.request.CreateDialysisTreatmentRequest;
import esprit.dialysisservice.dtos.request.UpdateDialysisTreatmentRequest;
import esprit.dialysisservice.dtos.response.DialysisTreatmentResponseDTO;
import esprit.dialysisservice.services.IDialysisTreatmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;


import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/treatments")
@RequiredArgsConstructor
public class DialysisTreatmentController {

    private final IDialysisTreatmentService treatmentService;
    private UUID extractPatientId(Authentication authentication) {
        JwtAuthenticationToken jwtAuth = (JwtAuthenticationToken) authentication;
        return UUID.fromString(jwtAuth.getToken().getSubject());
    }

    // ========================
    // DOCTOR: CREATE
    // ========================
    @PostMapping
    @PreAuthorize("hasRole('doctor')")
    public ResponseEntity<DialysisTreatmentResponseDTO> create(@Valid @RequestBody CreateDialysisTreatmentRequest dto) {
        return ResponseEntity.ok(treatmentService.addTreatment(dto));
    }

    // ========================
    // DOCTOR: UPDATE
    // ========================
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('doctor')")
    public ResponseEntity<DialysisTreatmentResponseDTO> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateDialysisTreatmentRequest dto
    ) {
        return ResponseEntity.ok(treatmentService.updateTreatment(id, dto));
    }

    // ========================
    // READ: admin + nurse
    // ========================
    @GetMapping
    @PreAuthorize("hasAnyRole('admin','nurse')")
    public ResponseEntity<List<DialysisTreatmentResponseDTO>> getAllTreatments() {
        return ResponseEntity.ok(treatmentService.getAllTreatments());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin','doctor','nurse')")
    public ResponseEntity<DialysisTreatmentResponseDTO> getTreatmentById(@PathVariable UUID id) {
        return ResponseEntity.ok(treatmentService.getTreatmentById(id));
    }

    // Staff usage (admin/doctor/nurse)
    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('admin','doctor','nurse')")
    public ResponseEntity<List<DialysisTreatmentResponseDTO>> getTreatmentsByPatient(@PathVariable UUID patientId) {
        return ResponseEntity.ok(treatmentService.getTreatmentsByPatient(patientId));
    }

    // ========================
    // DOCTOR: LIFECYCLE
    // ========================
    @PatchMapping("/{id}/suspend")
    @PreAuthorize("hasRole('doctor')")
    public ResponseEntity<DialysisTreatmentResponseDTO> suspendTreatment(
            @PathVariable UUID id,
            @RequestParam String reason
    ) {
        return ResponseEntity.ok(treatmentService.suspendTreatment(id, reason));
    }

    @PatchMapping("/{id}/archive")
    @PreAuthorize("hasRole('doctor')")
    public ResponseEntity<DialysisTreatmentResponseDTO> archiveTreatment(@PathVariable UUID id) {
        return ResponseEntity.ok(treatmentService.archiveTreatment(id));
    }

    // ========================
    // DOCTOR: "MY" treatments (kept)
    // ========================
    @GetMapping("/my")
    @PreAuthorize("hasRole('doctor')")
    public ResponseEntity<List<DialysisTreatmentResponseDTO>> myTreatments() {
        return ResponseEntity.ok(treatmentService.getMyTreatments());
    }

    // ========================
    // PATIENT: "MY" active treatment (Frontoffice)
    // ========================
    @GetMapping("/patient/my")
    public ResponseEntity<List<DialysisTreatmentResponseDTO>> myActiveTreatmentAsPatient(Authentication authentication) {
        UUID patientId = extractPatientId(authentication);
        return ResponseEntity.ok(treatmentService.getTreatmentsByPatient(patientId));
    }


    // ========================
    // ADMIN: delete
    // ========================
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<Void> deleteTreatment(@PathVariable UUID id) {
        treatmentService.deleteTreatment(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/audit/suspended")
    @PreAuthorize("hasAnyRole('admin','ADMIN')")
    public ResponseEntity<List<SuspendedTreatmentAuditDTO>> suspendedAudit() {
        return ResponseEntity.ok(treatmentService.getSuspendedAudit());
    }
}
