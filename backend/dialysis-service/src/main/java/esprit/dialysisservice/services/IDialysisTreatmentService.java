package esprit.dialysisservice.services;

import esprit.dialysisservice.dtos.SuspendedTreatmentAuditDTO;
import esprit.dialysisservice.dtos.request.CreateDialysisTreatmentRequest;
import esprit.dialysisservice.dtos.request.UpdateDialysisTreatmentRequest;
import esprit.dialysisservice.dtos.response.DialysisTreatmentResponseDTO;

import java.util.List;
import java.util.UUID;

public interface IDialysisTreatmentService {

    DialysisTreatmentResponseDTO addTreatment(CreateDialysisTreatmentRequest dto);

    DialysisTreatmentResponseDTO updateTreatment(UUID id, UpdateDialysisTreatmentRequest dto);

    List<DialysisTreatmentResponseDTO> getAllTreatments();

    DialysisTreatmentResponseDTO getTreatmentById(UUID id);

    List<DialysisTreatmentResponseDTO> getTreatmentsByPatient(UUID patientId);

    void deleteTreatment(UUID id);
    DialysisTreatmentResponseDTO suspendTreatment(UUID id, String reason);
    DialysisTreatmentResponseDTO archiveTreatment(UUID id);
    List<DialysisTreatmentResponseDTO> getMyTreatments();
    List<SuspendedTreatmentAuditDTO> getSuspendedAudit();
}
