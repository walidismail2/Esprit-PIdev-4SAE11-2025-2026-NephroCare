package esprit.clinicalservice.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class PreoperativeAssessmentDTO {

    private Long id;
    
    @NotNull(message = "Patient ID is required")
    private Long patientId;
    
    @NotNull(message = "Assessment date is required")
    @PastOrPresent(message = "Assessment date cannot be in the future")
    private LocalDate assessmentDate;
    
    private String ecgResult;
    private String echocardiogramResult;
    private String stressTestResult;
    
    @Min(value = 0, message = "Ejection fraction must be at least 0")
    @Max(value = 100, message = "Ejection fraction must be at most 100")
    private Double ejectionFraction;
    
    private Boolean cardiacClearance;
    
    @NotBlank(message = "HIV status is required")
    private String hivStatus;
    
    @NotBlank(message = "Hepatitis B status is required")
    private String hepBStatus;
    
    @NotBlank(message = "Hepatitis C status is required")
    private String hepCStatus;
    
    @NotBlank(message = "CMV status is required")
    private String cmvStatus;
    
    @NotBlank(message = "EBV status is required")
    private String ebvStatus;
    
    private String tbScreening;
    private Boolean idClearance;
    private String pulmonaryFunctionTest;
    private String chestXrayResult;
    private Boolean pulmonaryClearance;
    private Double preAssessmentCreatinine;
    private Double preAssessmentGFR;
    private String urineProteinLevel;
    private String psychiatricEvaluation;
    
    @Min(value = 0, message = "Compliance score must be at least 0")
    @Max(value = 100, message = "Compliance score must be at most 100")
    private Integer patientComplianceScore;
    
    private Boolean psychiatricClearance;
    @PastOrPresent(message = "Dental exam date cannot be in the future")
    private LocalDate dentalExamDate;
    private Boolean dentalTreatmentNeeded;
    private Boolean dentalClearance;
    
    @Min(value = 0, message = "Overall risk score must be at least 0")
    @Max(value = 100, message = "Overall risk score must be at most 100")
    private Integer overallRiskScore;
    
    @NotBlank(message = "Assessment status is required")
    private String status;
    
    private String recommendations;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long assessedBy;

    public PreoperativeAssessmentDTO() {}

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPatientId() {
        return patientId;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public LocalDate getAssessmentDate() {
        return assessmentDate;
    }

    public void setAssessmentDate(LocalDate assessmentDate) {
        this.assessmentDate = assessmentDate;
    }

    public String getEcgResult() {
        return ecgResult;
    }

    public void setEcgResult(String ecgResult) {
        this.ecgResult = ecgResult;
    }

    public String getEchocardiogramResult() {
        return echocardiogramResult;
    }

    public void setEchocardiogramResult(String echocardiogramResult) {
        this.echocardiogramResult = echocardiogramResult;
    }

    public String getStressTestResult() {
        return stressTestResult;
    }

    public void setStressTestResult(String stressTestResult) {
        this.stressTestResult = stressTestResult;
    }

    public Double getEjectionFraction() {
        return ejectionFraction;
    }

    public void setEjectionFraction(Double ejectionFraction) {
        this.ejectionFraction = ejectionFraction;
    }

    public Boolean getCardiacClearance() {
        return cardiacClearance;
    }

    public void setCardiacClearance(Boolean cardiacClearance) {
        this.cardiacClearance = cardiacClearance;
    }

    public String getHivStatus() {
        return hivStatus;
    }

    public void setHivStatus(String hivStatus) {
        this.hivStatus = hivStatus;
    }

    public String getHepBStatus() {
        return hepBStatus;
    }

    public void setHepBStatus(String hepBStatus) {
        this.hepBStatus = hepBStatus;
    }

    public String getHepCStatus() {
        return hepCStatus;
    }

    public void setHepCStatus(String hepCStatus) {
        this.hepCStatus = hepCStatus;
    }

    public String getCmvStatus() {
        return cmvStatus;
    }

    public void setCmvStatus(String cmvStatus) {
        this.cmvStatus = cmvStatus;
    }

    public String getEbvStatus() {
        return ebvStatus;
    }

    public void setEbvStatus(String ebvStatus) {
        this.ebvStatus = ebvStatus;
    }

    public String getTbScreening() {
        return tbScreening;
    }

    public void setTbScreening(String tbScreening) {
        this.tbScreening = tbScreening;
    }

    public Boolean getIdClearance() {
        return idClearance;
    }

    public void setIdClearance(Boolean idClearance) {
        this.idClearance = idClearance;
    }

    public String getPulmonaryFunctionTest() {
        return pulmonaryFunctionTest;
    }

    public void setPulmonaryFunctionTest(String pulmonaryFunctionTest) {
        this.pulmonaryFunctionTest = pulmonaryFunctionTest;
    }

    public String getChestXrayResult() {
        return chestXrayResult;
    }

    public void setChestXrayResult(String chestXrayResult) {
        this.chestXrayResult = chestXrayResult;
    }

    public Boolean getPulmonaryClearance() {
        return pulmonaryClearance;
    }

    public void setPulmonaryClearance(Boolean pulmonaryClearance) {
        this.pulmonaryClearance = pulmonaryClearance;
    }

    public Double getPreAssessmentCreatinine() {
        return preAssessmentCreatinine;
    }

    public void setPreAssessmentCreatinine(Double preAssessmentCreatinine) {
        this.preAssessmentCreatinine = preAssessmentCreatinine;
    }

    public Double getPreAssessmentGFR() {
        return preAssessmentGFR;
    }

    public void setPreAssessmentGFR(Double preAssessmentGFR) {
        this.preAssessmentGFR = preAssessmentGFR;
    }

    public String getUrineProteinLevel() {
        return urineProteinLevel;
    }

    public void setUrineProteinLevel(String urineProteinLevel) {
        this.urineProteinLevel = urineProteinLevel;
    }

    public String getPsychiatricEvaluation() {
        return psychiatricEvaluation;
    }

    public void setPsychiatricEvaluation(String psychiatricEvaluation) {
        this.psychiatricEvaluation = psychiatricEvaluation;
    }

    public Integer getPatientComplianceScore() {
        return patientComplianceScore;
    }

    public void setPatientComplianceScore(Integer patientComplianceScore) {
        this.patientComplianceScore = patientComplianceScore;
    }

    public Boolean getPsychiatricClearance() {
        return psychiatricClearance;
    }

    public void setPsychiatricClearance(Boolean psychiatricClearance) {
        this.psychiatricClearance = psychiatricClearance;
    }

    public LocalDate getDentalExamDate() {
        return dentalExamDate;
    }

    public void setDentalExamDate(LocalDate dentalExamDate) {
        this.dentalExamDate = dentalExamDate;
    }

    public Boolean getDentalTreatmentNeeded() {
        return dentalTreatmentNeeded;
    }

    public void setDentalTreatmentNeeded(Boolean dentalTreatmentNeeded) {
        this.dentalTreatmentNeeded = dentalTreatmentNeeded;
    }

    public Boolean getDentalClearance() {
        return dentalClearance;
    }

    public void setDentalClearance(Boolean dentalClearance) {
        this.dentalClearance = dentalClearance;
    }

    public Integer getOverallRiskScore() {
        return overallRiskScore;
    }

    public void setOverallRiskScore(Integer overallRiskScore) {
        this.overallRiskScore = overallRiskScore;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRecommendations() {
        return recommendations;
    }

    public void setRecommendations(String recommendations) {
        this.recommendations = recommendations;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getAssessedBy() {
        return assessedBy;
    }

    public void setAssessedBy(Long assessedBy) {
        this.assessedBy = assessedBy;
    }
}
