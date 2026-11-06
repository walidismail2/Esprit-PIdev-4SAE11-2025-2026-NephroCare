package esprit.clinicalservice.entities;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "preoperative_assessments")
public class PreoperativeAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "assessment_date")
    private LocalDate assessmentDate;

    // Cardiac Assessment
    @Column(name = "ecg_result")
    private String ecgResult;

    @Column(name = "echocardiogram_result")
    private String echocardiogramResult;

    @Column(name = "stress_test_result")
    private String stressTestResult;

    @Column(name = "ejection_fraction")
    private Double ejectionFraction;

    @Column(name = "cardiac_clearance")
    private Boolean cardiacClearance;

    // Infectious Disease Assessment
    @Column(name = "hiv_status")
    @Enumerated(EnumType.STRING)
    private HIVStatus hivStatus; // NEGATIVE, POSITIVE, UNKNOWN

    @Column(name = "hep_b_status")
    @Enumerated(EnumType.STRING)
    private HepatitisStatus hepBStatus;

    @Column(name = "hep_c_status")
    @Enumerated(EnumType.STRING)
    private HepatitisStatus hepCStatus;

    @Column(name = "cmv_status")
    @Enumerated(EnumType.STRING)
    private CMVStatus cmvStatus; // POSITIVE, NEGATIVE, UNKNOWN

    @Column(name = "ebv_status")
    @Enumerated(EnumType.STRING)
    private EBVStatus ebvStatus; // POSITIVE, NEGATIVE, UNKNOWN

    @Column(name = "tb_screening")
    private String tbScreening;

    @Column(name = "id_clearance")
    private Boolean idClearance;

    // Pulmonary Assessment
    @Column(name = "pulmonary_function_test")
    private String pulmonaryFunctionTest;

    @Column(name = "chest_xray_result")
    private String chestXrayResult;

    @Column(name = "pulmonary_clearance")
    private Boolean pulmonaryClearance;

    // Renal Function
    @Column(name = "pre_assessment_creatinine")
    private Double preAssessmentCreatinine;

    @Column(name = "pre_assessment_gfr")
    private Double preAssessmentGFR;

    @Column(name = "urine_protein_level")
    private String urineProteinLevel;

    // Psychological Assessment
    @Column(name = "psychiatric_evaluation")
    private String psychiatricEvaluation;

    @Column(name = "patient_compliance_score")
    private Integer patientComplianceScore; // 0-100

    @Column(name = "psychiatric_clearance")
    private Boolean psychiatricClearance;

    // Dental Assessment
    @Column(name = "dental_exam_date")
    private LocalDate dentalExamDate;

    @Column(name = "dental_treatment_needed")
    private Boolean dentalTreatmentNeeded;

    @Column(name = "dental_clearance")
    private Boolean dentalClearance;

    // General Assessment
    @Column(name = "overall_risk_score")
    private Integer overallRiskScore; // 0-100 (higher = higher risk)

    @Column(name = "assessment_status")
    @Enumerated(EnumType.STRING)
    private AssessmentStatus status; // PENDING, CLEARED, CONTRAINDICATED, REVIEW_NEEDED

    @Column(columnDefinition = "TEXT")
    private String recommendations;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "assessed_by")
    private Long assessedBy;

    public PreoperativeAssessment() {
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

    public HIVStatus getHivStatus() {
        return hivStatus;
    }

    public void setHivStatus(HIVStatus hivStatus) {
        this.hivStatus = hivStatus;
    }

    public HepatitisStatus getHepBStatus() {
        return hepBStatus;
    }

    public void setHepBStatus(HepatitisStatus hepBStatus) {
        this.hepBStatus = hepBStatus;
    }

    public HepatitisStatus getHepCStatus() {
        return hepCStatus;
    }

    public void setHepCStatus(HepatitisStatus hepCStatus) {
        this.hepCStatus = hepCStatus;
    }

    public CMVStatus getCmvStatus() {
        return cmvStatus;
    }

    public void setCmvStatus(CMVStatus cmvStatus) {
        this.cmvStatus = cmvStatus;
    }

    public EBVStatus getEbvStatus() {
        return ebvStatus;
    }

    public void setEbvStatus(EBVStatus ebvStatus) {
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

    public AssessmentStatus getStatus() {
        return status;
    }

    public void setStatus(AssessmentStatus status) {
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

    public enum HIVStatus {
        NEGATIVE, POSITIVE, UNKNOWN
    }

    public enum HepatitisStatus {
        NEGATIVE, POSITIVE, IMMUNE, UNKNOWN
    }

    public enum CMVStatus {
        POSITIVE, NEGATIVE, UNKNOWN
    }

    public enum EBVStatus {
        POSITIVE, NEGATIVE, UNKNOWN
    }

    public enum AssessmentStatus {
        PENDING, CLEARED, CONTRAINDICATED, REVIEW_NEEDED
    }
}
