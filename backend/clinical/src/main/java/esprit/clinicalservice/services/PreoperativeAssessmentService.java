package esprit.clinicalservice.services;

import esprit.clinicalservice.dtos.PreoperativeAssessmentDTO;
import esprit.clinicalservice.entities.PreoperativeAssessment;
import esprit.clinicalservice.repositories.PreoperativeAssessmentRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class PreoperativeAssessmentService {

    private final PreoperativeAssessmentRepository repository;

    public PreoperativeAssessmentService(PreoperativeAssessmentRepository repository) {
        this.repository = repository;
    }

    public PreoperativeAssessmentDTO createAssessment(PreoperativeAssessmentDTO dto, Long assessedBy) {
        PreoperativeAssessment entity = new PreoperativeAssessment();
        mapDTOToEntity(dto, entity, assessedBy);
        entity.setCreatedAt(LocalDateTime.now());

        PreoperativeAssessment saved = repository.save(entity);
        return convertToDTO(saved);
    }

    public PreoperativeAssessmentDTO updateAssessment(Long id, PreoperativeAssessmentDTO dto) {
        Optional<PreoperativeAssessment> existing = repository.findById(id);
        if (existing.isEmpty()) {
            throw new RuntimeException("Preoperative assessment not found");
        }

        PreoperativeAssessment entity = existing.get();
        mapDTOToEntity(dto, entity, entity.getAssessedBy());
        entity.setUpdatedAt(LocalDateTime.now());

        PreoperativeAssessment updated = repository.save(entity);
        return convertToDTO(updated);
    }

    public PreoperativeAssessmentDTO getAssessmentByPatientId(Long patientId) {
        Optional<PreoperativeAssessment> assessment = repository.findTopByPatientIdOrderByAssessmentDateDescCreatedAtDesc(patientId);
        return assessment.map(this::convertToDTO).orElse(null);
    }

    public PreoperativeAssessmentDTO getAssessmentById(Long id) {
        Optional<PreoperativeAssessment> assessment = repository.findById(id);
        return assessment.map(this::convertToDTO).orElse(null);
    }

    public List<PreoperativeAssessmentDTO> getAssessmentHistoryByPatientId(Long patientId) {
        return repository.findByPatientIdOrderByAssessmentDateDesc(patientId)
                .stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    public List<PreoperativeAssessmentDTO> getAllAssessments() {
        return repository.findAll().stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    public List<PreoperativeAssessmentDTO> getAssessmentsByStatus(String status) {
        return repository.findByStatus(status).stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    public void deleteAssessment(Long id) {
        repository.deleteById(id);
    }

    private void mapDTOToEntity(PreoperativeAssessmentDTO dto, PreoperativeAssessment entity, Long assessedBy) {
        entity.setPatientId(dto.getPatientId());
        entity.setAssessmentDate(dto.getAssessmentDate());
        entity.setEcgResult(dto.getEcgResult());
        entity.setEchocardiogramResult(dto.getEchocardiogramResult());
        entity.setStressTestResult(dto.getStressTestResult());
        entity.setEjectionFraction(dto.getEjectionFraction());
        entity.setCardiacClearance(dto.getCardiacClearance());
        entity.setHivStatus(PreoperativeAssessment.HIVStatus.valueOf(dto.getHivStatus()));
        entity.setHepBStatus(PreoperativeAssessment.HepatitisStatus.valueOf(dto.getHepBStatus()));
        entity.setHepCStatus(PreoperativeAssessment.HepatitisStatus.valueOf(dto.getHepCStatus()));
        entity.setCmvStatus(PreoperativeAssessment.CMVStatus.valueOf(dto.getCmvStatus()));
        entity.setEbvStatus(PreoperativeAssessment.EBVStatus.valueOf(dto.getEbvStatus()));
        entity.setTbScreening(dto.getTbScreening());
        entity.setIdClearance(dto.getIdClearance());
        entity.setPulmonaryFunctionTest(dto.getPulmonaryFunctionTest());
        entity.setChestXrayResult(dto.getChestXrayResult());
        entity.setPulmonaryClearance(dto.getPulmonaryClearance());
        entity.setPreAssessmentCreatinine(dto.getPreAssessmentCreatinine());
        entity.setPreAssessmentGFR(dto.getPreAssessmentGFR());
        entity.setUrineProteinLevel(dto.getUrineProteinLevel());
        entity.setPsychiatricEvaluation(dto.getPsychiatricEvaluation());
        entity.setPatientComplianceScore(dto.getPatientComplianceScore());
        entity.setPsychiatricClearance(dto.getPsychiatricClearance());
        entity.setDentalExamDate(dto.getDentalExamDate());
        entity.setDentalTreatmentNeeded(dto.getDentalTreatmentNeeded());
        entity.setDentalClearance(dto.getDentalClearance());
        entity.setOverallRiskScore(dto.getOverallRiskScore());
        entity.setStatus(PreoperativeAssessment.AssessmentStatus.valueOf(dto.getStatus()));
        entity.setRecommendations(dto.getRecommendations());
        entity.setNotes(dto.getNotes());
        entity.setAssessedBy(assessedBy);
    }

    private PreoperativeAssessmentDTO convertToDTO(PreoperativeAssessment entity) {
        PreoperativeAssessmentDTO dto = new PreoperativeAssessmentDTO();
        dto.setId(entity.getId());
        dto.setPatientId(entity.getPatientId());
        dto.setAssessmentDate(entity.getAssessmentDate());
        dto.setEcgResult(entity.getEcgResult());
        dto.setEchocardiogramResult(entity.getEchocardiogramResult());
        dto.setStressTestResult(entity.getStressTestResult());
        dto.setEjectionFraction(entity.getEjectionFraction());
        dto.setCardiacClearance(entity.getCardiacClearance());
        dto.setHivStatus(entity.getHivStatus().name());
        dto.setHepBStatus(entity.getHepBStatus().name());
        dto.setHepCStatus(entity.getHepCStatus().name());
        dto.setCmvStatus(entity.getCmvStatus().name());
        dto.setEbvStatus(entity.getEbvStatus().name());
        dto.setTbScreening(entity.getTbScreening());
        dto.setIdClearance(entity.getIdClearance());
        dto.setPulmonaryFunctionTest(entity.getPulmonaryFunctionTest());
        dto.setChestXrayResult(entity.getChestXrayResult());
        dto.setPulmonaryClearance(entity.getPulmonaryClearance());
        dto.setPreAssessmentCreatinine(entity.getPreAssessmentCreatinine());
        dto.setPreAssessmentGFR(entity.getPreAssessmentGFR());
        dto.setUrineProteinLevel(entity.getUrineProteinLevel());
        dto.setPsychiatricEvaluation(entity.getPsychiatricEvaluation());
        dto.setPatientComplianceScore(entity.getPatientComplianceScore());
        dto.setPsychiatricClearance(entity.getPsychiatricClearance());
        dto.setDentalExamDate(entity.getDentalExamDate());
        dto.setDentalTreatmentNeeded(entity.getDentalTreatmentNeeded());
        dto.setDentalClearance(entity.getDentalClearance());
        dto.setOverallRiskScore(entity.getOverallRiskScore());
        dto.setStatus(entity.getStatus().name());
        dto.setRecommendations(entity.getRecommendations());
        dto.setNotes(entity.getNotes());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        dto.setAssessedBy(entity.getAssessedBy());
        return dto;
    }
}
