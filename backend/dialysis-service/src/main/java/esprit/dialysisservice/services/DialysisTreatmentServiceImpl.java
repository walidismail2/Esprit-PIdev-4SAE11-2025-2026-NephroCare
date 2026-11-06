package esprit.dialysisservice.services;

import esprit.dialysisservice.dtos.SuspendedTreatmentAuditDTO;
import esprit.dialysisservice.dtos.request.CreateDialysisTreatmentRequest;
import esprit.dialysisservice.dtos.request.UpdateDialysisTreatmentRequest;
import esprit.dialysisservice.dtos.response.DialysisTreatmentResponseDTO;
import esprit.dialysisservice.entities.DialysisTreatment;
import esprit.dialysisservice.entities.enums.TreatmentStatus;
import esprit.dialysisservice.exceptions.EntityNotFoundException;
import esprit.dialysisservice.mapper.DialysisMapper;
import esprit.dialysisservice.repositories.DialysisSessionRepository;
import esprit.dialysisservice.repositories.DialysisTreatmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DialysisTreatmentServiceImpl implements IDialysisTreatmentService {

    private final DialysisTreatmentRepository treatmentRepository;
    private final DialysisSessionRepository sessionRepository;
    private final DialysisMapper mapper;
    private final UserService userService;

    // =========================
    // CREATE (doctor only - protected by controller)
    // =========================
    @Override
    @Transactional
    public DialysisTreatmentResponseDTO addTreatment(CreateDialysisTreatmentRequest dto) {
        DialysisTreatment treatment = new DialysisTreatment();

        treatment.setPatientId(dto.getPatientId());
        treatment.setDialysisType(dto.getDialysisType());
        treatment.setVascularAccessType(dto.getVascularAccessType());
        treatment.setFrequencyPerWeek(dto.getFrequencyPerWeek());
        treatment.setPrescribedDurationMinutes(dto.getPrescribedDurationMinutes());
        treatment.setTargetDryWeight(dto.getTargetDryWeight());
        treatment.setStartDate(dto.getStartDate() != null ? dto.getStartDate() : LocalDate.now());

        UUID doctorId = getAuthenticatedUserUuidOrThrow();
        treatment.setDoctorId(doctorId);

        treatment.setStatus(TreatmentStatus.ACTIVE);

        return enrichWithUserData(treatmentRepository.save(treatment));
    }

    // =========================
    // UPDATE (doctor only + ownership)
    // =========================
    @Override
    @Transactional
    public DialysisTreatmentResponseDTO updateTreatment(UUID id, UpdateDialysisTreatmentRequest dto) {
        UUID doctorId = getAuthenticatedUserUuidOrThrow();

        DialysisTreatment existing = treatmentRepository.findByIdAndDoctorId(id, doctorId)
                .orElseThrow(() -> new EntityNotFoundException("Treatment not found or not owned by doctor"));

        existing.setDialysisType(dto.getDialysisType());
        existing.setVascularAccessType(dto.getVascularAccessType());
        existing.setFrequencyPerWeek(dto.getFrequencyPerWeek());
        existing.setPrescribedDurationMinutes(dto.getPrescribedDurationMinutes());
        existing.setTargetDryWeight(dto.getTargetDryWeight());

        return enrichWithUserData(treatmentRepository.save(existing));
    }

    // =========================
    // LIST
    // - doctor: only my treatments
    // - nurse/admin: all treatments
    // =========================
    @Override
    public List<DialysisTreatmentResponseDTO> getAllTreatments() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        boolean isDoctor = hasRole(auth, "ROLE_doctor");
        boolean isNurse = hasRole(auth, "ROLE_nurse");
        boolean isAdmin = hasRole(auth, "ROLE_admin");

        List<DialysisTreatment> treatments;

        if (isDoctor) {
            UUID doctorId = getAuthenticatedUserUuidOrThrow();
            treatments = treatmentRepository.findByDoctorId(doctorId);
        } else if (isNurse || isAdmin) {
            treatments = treatmentRepository.findAll();
        } else {
            return List.of();
        }

        return enrichListWithUserData(treatments);
    }

    @Override
    public DialysisTreatmentResponseDTO getTreatmentById(UUID id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // Doctor reads only own treatment
        if (hasRole(auth, "ROLE_doctor")) {
            UUID doctorId = getAuthenticatedUserUuidOrThrow();
            DialysisTreatment t = treatmentRepository.findByIdAndDoctorId(id, doctorId)
                    .orElseThrow(() -> new EntityNotFoundException("Treatment not found or not owned by doctor"));
            return enrichWithUserData(t);
        }

        // Nurse OR Admin can read any
        if (hasRole(auth, "ROLE_nurse") || hasRole(auth, "ROLE_admin")) {
            DialysisTreatment t = treatmentRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("Treatment not found"));
            return enrichWithUserData(t);
        }

        throw new EntityNotFoundException("Treatment not found");
    }

    @Override
    public List<DialysisTreatmentResponseDTO> getTreatmentsByPatient(UUID patientId) {
        return enrichListWithUserData(treatmentRepository.findByPatientId(patientId));
    }

    // =========================
    // HARD DELETE (admin only - protected by controller)
    // =========================
    @Override
    @Transactional
    public void deleteTreatment(UUID id) {
        if (!treatmentRepository.existsById(id)) {
            throw new EntityNotFoundException("Treatment not found with ID: " + id);
        }

        // delete sessions first to avoid FK errors (if no cascade)
        sessionRepository.deleteByTreatment_Id(id);

        treatmentRepository.deleteById(id);
    }

    // =========================
    // SUSPEND / ARCHIVE (doctor only + ownership)
    // =========================
    @Override
    @Transactional
    public DialysisTreatmentResponseDTO suspendTreatment(UUID id, String reason) {
        UUID doctorId = getAuthenticatedUserUuidOrThrow();

        DialysisTreatment treatment = treatmentRepository.findByIdAndDoctorId(id, doctorId)
                .orElseThrow(() -> new EntityNotFoundException("Treatment not found or not owned by doctor"));

        if (treatment.getStatus() != TreatmentStatus.ACTIVE) {
            throw new IllegalStateException("Only ACTIVE treatments can be suspended.");
        }

        // IMPORTANT: store reason + timestamp (your audit relies on them)
        treatment.setSuspensionReason(reason);
        treatment.setSuspendedAt(LocalDateTime.now());
        treatment.setStatus(TreatmentStatus.SUSPENDED);

        return enrichWithUserData(treatmentRepository.save(treatment));
    }

    @Override
    @Transactional
    public DialysisTreatmentResponseDTO archiveTreatment(UUID id) {
        UUID doctorId = getAuthenticatedUserUuidOrThrow();

        DialysisTreatment treatment = treatmentRepository.findByIdAndDoctorId(id, doctorId)
                .orElseThrow(() -> new EntityNotFoundException("Treatment not found or not owned by doctor"));

        treatment.setStatus(TreatmentStatus.ARCHIVED);

        return enrichWithUserData(treatmentRepository.save(treatment));
    }

    // =========================
    // MY (doctor)
    // =========================
    @Override
    @Transactional(readOnly = true)
    public List<DialysisTreatmentResponseDTO> getMyTreatments() {
        UUID doctorId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
        return treatmentRepository.findByDoctorId(doctorId)
                .stream()
                .map(this::enrichWithUserData)
                .toList();
    }

    // =========================
    // SCENARIO 4.3: AUDIT (admin)
    // =========================
    @Override
    public List<SuspendedTreatmentAuditDTO> getSuspendedAudit() {
        List<DialysisTreatment> suspended = treatmentRepository
                .findByStatusOrderBySuspendedAtDesc(TreatmentStatus.SUSPENDED);

        if (suspended == null || suspended.isEmpty()) return List.of();

        // One Keycloak call total (patients list)
        Map<String, String> patientIdToName = userService.getPatients().stream()
                .collect(Collectors.toMap(
                        p -> p.getId(),
                        p -> (p.getFullName() == null || p.getFullName().isBlank()) ? p.getId() : p.getFullName(),
                        (a, b) -> a
                ));

        return suspended.stream()
                .map(t -> {
                    String pid = t.getPatientId() != null ? t.getPatientId().toString() : null;
                    String pname = (pid == null) ? null : patientIdToName.getOrDefault(pid, fallbackPatientName(t.getPatientId()));

                    return SuspendedTreatmentAuditDTO.builder()
                            .treatmentId(t.getId())
                            .patientId(t.getPatientId())
                            .patientName(pname)
                            .doctorId(t.getDoctorId())
                            .dialysisType(t.getDialysisType() != null ? t.getDialysisType().name() : null)
                            .vascularAccessType(t.getVascularAccessType() != null ? t.getVascularAccessType().name() : null)
                            .suspendedReason(t.getSuspensionReason())
                            .suspendedAt(t.getSuspendedAt())
                            .frequencyPerWeek(t.getFrequencyPerWeek())
                            .build();
                })
                .toList();
    }

    // =========================
    // Helpers
    // =========================
    private UUID getAuthenticatedUserUuidOrThrow() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new IllegalStateException("No authentication in security context");

        String sub = auth.getName();
        if (sub == null || sub.isBlank()) throw new IllegalStateException("Cannot extract user id (sub) from token");

        try {
            return UUID.fromString(sub);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("Token subject is not a UUID: " + sub);
        }
    }

    private boolean hasRole(Authentication auth, String role) {
        if (auth == null) return false;
        for (GrantedAuthority ga : auth.getAuthorities()) {
            if (role.equals(ga.getAuthority())) return true;
        }
        return false;
    }

    private DialysisTreatmentResponseDTO enrichWithUserData(DialysisTreatment treatment) {
        DialysisTreatmentResponseDTO dto = mapper.toResponse(treatment);

        if (treatment.getPatientId() != null) {
            dto.setPatientName(resolveUserNameSafe(treatment.getPatientId().toString(), true));
        }

        return dto;
    }

    private List<DialysisTreatmentResponseDTO> enrichListWithUserData(List<DialysisTreatment> treatments) {
        if (treatments == null || treatments.isEmpty()) return List.of();

        Map<String, String> patientIdToName = userService.getPatients().stream()
                .collect(Collectors.toMap(
                        p -> p.getId(),
                        p -> (p.getFullName() == null || p.getFullName().isBlank()) ? p.getId() : p.getFullName(),
                        (a, b) -> a
                ));

        return treatments.stream()
                .map(t -> {
                    DialysisTreatmentResponseDTO dto = mapper.toResponse(t);
                    if (dto == null) return null;

                    String pid = t.getPatientId() != null ? t.getPatientId().toString() : null;
                    if (pid != null) {
                        dto.setPatientName(patientIdToName.getOrDefault(pid, fallbackPatientName(t.getPatientId())));
                    }
                    return dto;
                })
                .filter(Objects::nonNull)
                .toList();
    }

    private String resolveUserNameSafe(String userId, boolean isPatient) {
        try {
            var u = userService.getUserById(userId);
            if (u != null && u.getFullName() != null && !u.getFullName().isBlank()) {
                return u.getFullName();
            }
        } catch (Exception ignored) {
        }
        String shortId = userId.length() >= 8 ? userId.substring(0, 8) : userId;
        return (isPatient ? "Patient #" : "User #") + shortId;
    }

    private String fallbackPatientName(UUID patientId) {
        if (patientId == null) return "Patient";
        String s = patientId.toString();
        return "Patient #" + (s.length() >= 8 ? s.substring(0, 8) : s);
    }
}
