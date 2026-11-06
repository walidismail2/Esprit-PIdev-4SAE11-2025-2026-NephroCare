package esprit.clinicalservice.entities;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "transplant_candidacy")
public class TransplantCandidacy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "candidacy_status", nullable = false)
    @Enumerated(EnumType.STRING)
    private CandidacyStatus status; // ELIGIBLE, INELIGIBLE, PENDING, WAITLISTED, TRANSPLANTED

    @Column(name = "eligibility_score")
    private Integer eligibilityScore; // 0-100

    @Column(columnDefinition = "TEXT")
    private String eligibilityNotes;

    @Column(name = "ecd_suitable")
    private Boolean ecdSuitable; // Extended Criteria Donor

    @Column(name = "living_donor_suitable")
    private Boolean livingDonorSuitable;

    @Column(name = "hla_sensitization_level")
    @Enumerated(EnumType.STRING)
    private HLASensitization hlaLevel; // LOW, MODERATE, HIGH

    @Column(name = "panel_reactive_antibody")
    private Integer panelReactiveAntibody; // PRA percentage (0-100)

    @Column(name = "cardiovascular_clearance")
    private Boolean cardiovascularClearance;

    @Column(name = "infectious_disease_clearance")
    private Boolean infectiousDiseaseCleanance;

    @Column(name = "psychological_clearance")
    private Boolean psychologicalClearance;

    @Column(name = "social_support_assessment")
    private Boolean socialSupportAssessment;

    @Column(name = "contraindications", columnDefinition = "TEXT")
    private String contraindications;

    @Column(name = "recommended_dialysis_modality")
    @Enumerated(EnumType.STRING)
    private DialysisModality dialysisModality; // IN_CENTER_HD, NOCTURNAL_HD, PD, HDF

    @Column(name = "waitlist_date")
    private LocalDate waitlistDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private Long createdBy;

    public TransplantCandidacy() {
        this.createdAt = LocalDateTime.now();
    }

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

    public CandidacyStatus getStatus() {
        return status;
    }

    public void setStatus(CandidacyStatus status) {
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

    public HLASensitization getHlaLevel() {
        return hlaLevel;
    }

    public void setHlaLevel(HLASensitization hlaLevel) {
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

    public DialysisModality getDialysisModality() {
        return dialysisModality;
    }

    public void setDialysisModality(DialysisModality dialysisModality) {
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

    public enum CandidacyStatus {
        ELIGIBLE, INELIGIBLE, PENDING, WAITLISTED, TRANSPLANTED, DECLINED
    }

    public enum HLASensitization {
        LOW, MODERATE, HIGH
    }

    public enum DialysisModality {
        IN_CENTER_HD, NOCTURNAL_HD, PD, HDF
    }
}
