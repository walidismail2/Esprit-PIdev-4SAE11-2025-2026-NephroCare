package esprit.clinicalservice.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class TransplantCandidacyDTO {

    private Long id;
    
    @NotNull(message = "Patient ID is required")
    private Long patientId;
    
    @NotBlank(message = "Status is required")
    private String status;
    
    @Min(value = 0, message = "Eligibility score must be at least 0")
    @Max(value = 100, message = "Eligibility score must be at most 100")
    private Integer eligibilityScore;
    
    private String eligibilityNotes;
    private Boolean ecdSuitable;
    private Boolean livingDonorSuitable;
    
    @NotBlank(message = "HLA level is required")
    private String hlaLevel;
    
    @Min(value = 0, message = "PRA must be at least 0")
    @Max(value = 100, message = "PRA must be at most 100")
    private Integer panelReactiveAntibody;
    
    private Boolean cardiovascularClearance;
    private Boolean infectiousDiseaseCleanance;
    private Boolean psychologicalClearance;
    private Boolean socialSupportAssessment;
    
    private String contraindications;
    
    @NotBlank(message = "Dialysis modality is required")
    private String dialysisModality;
    
    @PastOrPresent(message = "Waitlist date cannot be in the future")
    private LocalDate waitlistDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long createdBy;

    public TransplantCandidacyDTO() {}

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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getEligibilityScore() {
        return eligibilityScore;
    }

    public void setEligibilityScore(Integer eligibilityScore) {
        this.eligibilityScore = eligibilityScore;
    }

    public String getEligibilityNotes() {
        return eligibilityNotes;
    }

    public void setEligibilityNotes(String eligibilityNotes) {
        this.eligibilityNotes = eligibilityNotes;
    }

    public Boolean getEcdSuitable() {
        return ecdSuitable;
    }

    public void setEcdSuitable(Boolean ecdSuitable) {
        this.ecdSuitable = ecdSuitable;
    }

    public Boolean getLivingDonorSuitable() {
        return livingDonorSuitable;
    }

    public void setLivingDonorSuitable(Boolean livingDonorSuitable) {
        this.livingDonorSuitable = livingDonorSuitable;
    }

    public String getHlaLevel() {
        return hlaLevel;
    }

    public void setHlaLevel(String hlaLevel) {
        this.hlaLevel = hlaLevel;
    }

    public Integer getPanelReactiveAntibody() {
        return panelReactiveAntibody;
    }

    public void setPanelReactiveAntibody(Integer panelReactiveAntibody) {
        this.panelReactiveAntibody = panelReactiveAntibody;
    }

    public Boolean getCardiovascularClearance() {
        return cardiovascularClearance;
    }

    public void setCardiovascularClearance(Boolean cardiovascularClearance) {
        this.cardiovascularClearance = cardiovascularClearance;
    }

    public Boolean getInfectiousDiseaseCleanance() {
        return infectiousDiseaseCleanance;
    }

    public void setInfectiousDiseaseCleanance(Boolean infectiousDiseaseCleanance) {
        this.infectiousDiseaseCleanance = infectiousDiseaseCleanance;
    }

    public Boolean getPsychologicalClearance() {
        return psychologicalClearance;
    }

    public void setPsychologicalClearance(Boolean psychologicalClearance) {
        this.psychologicalClearance = psychologicalClearance;
    }

    public Boolean getSocialSupportAssessment() {
        return socialSupportAssessment;
    }

    public void setSocialSupportAssessment(Boolean socialSupportAssessment) {
        this.socialSupportAssessment = socialSupportAssessment;
    }

    public String getContraindications() {
        return contraindications;
    }

    public void setContraindications(String contraindications) {
        this.contraindications = contraindications;
    }

    public String getDialysisModality() {
        return dialysisModality;
    }

    public void setDialysisModality(String dialysisModality) {
        this.dialysisModality = dialysisModality;
    }

    public LocalDate getWaitlistDate() {
        return waitlistDate;
    }

    public void setWaitlistDate(LocalDate waitlistDate) {
        this.waitlistDate = waitlistDate;
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

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }
}
