package esprit.clinicalservice.dtos;

public class DoctorEfficiencyDTO {

    private Long doctorId;
    private long assignedCases;
    private long completedCases;
    private long highAcuityCases;
    private double completionRate;
    private double slaRespectRate;
    private double avgStartDelayMinutes;
    private double avgTreatmentMinutes;
    private double efficiencyScore;

    public DoctorEfficiencyDTO() {
    }

    public Long getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(Long doctorId) {
        this.doctorId = doctorId;
    }

    public long getAssignedCases() {
        return assignedCases;
    }

    public void setAssignedCases(long assignedCases) {
        this.assignedCases = assignedCases;
    }

    public long getCompletedCases() {
        return completedCases;
    }

    public void setCompletedCases(long completedCases) {
        this.completedCases = completedCases;
    }

    public long getHighAcuityCases() {
        return highAcuityCases;
    }

    public void setHighAcuityCases(long highAcuityCases) {
        this.highAcuityCases = highAcuityCases;
    }

    public double getCompletionRate() {
        return completionRate;
    }

    public void setCompletionRate(double completionRate) {
        this.completionRate = completionRate;
    }

    public double getSlaRespectRate() {
        return slaRespectRate;
    }

    public void setSlaRespectRate(double slaRespectRate) {
        this.slaRespectRate = slaRespectRate;
    }

    public double getAvgStartDelayMinutes() {
        return avgStartDelayMinutes;
    }

    public void setAvgStartDelayMinutes(double avgStartDelayMinutes) {
        this.avgStartDelayMinutes = avgStartDelayMinutes;
    }

    public double getAvgTreatmentMinutes() {
        return avgTreatmentMinutes;
    }

    public void setAvgTreatmentMinutes(double avgTreatmentMinutes) {
        this.avgTreatmentMinutes = avgTreatmentMinutes;
    }

    public double getEfficiencyScore() {
        return efficiencyScore;
    }

    public void setEfficiencyScore(double efficiencyScore) {
        this.efficiencyScore = efficiencyScore;
    }
}
