package esprit.clinicalservice.dtos;

public class TriageQueueActionDTO {

    private Long doctorId;

    public TriageQueueActionDTO() {
    }

    public Long getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(Long doctorId) {
        this.doctorId = doctorId;
    }
}
