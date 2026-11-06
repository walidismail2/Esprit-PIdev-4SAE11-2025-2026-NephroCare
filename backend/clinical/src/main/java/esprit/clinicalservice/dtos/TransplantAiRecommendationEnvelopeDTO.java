package esprit.clinicalservice.dtos;

public class TransplantAiRecommendationEnvelopeDTO {

    private Long patientId;
    private Long candidacyId;
    private String generatedAt;
    private TransplantAiRecommendationDTO recommendation;

    public Long getPatientId() {
        return patientId;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public Long getCandidacyId() {
        return candidacyId;
    }

    public void setCandidacyId(Long candidacyId) {
        this.candidacyId = candidacyId;
    }

    public String getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(String generatedAt) {
        this.generatedAt = generatedAt;
    }

    public TransplantAiRecommendationDTO getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(TransplantAiRecommendationDTO recommendation) {
        this.recommendation = recommendation;
    }
}

