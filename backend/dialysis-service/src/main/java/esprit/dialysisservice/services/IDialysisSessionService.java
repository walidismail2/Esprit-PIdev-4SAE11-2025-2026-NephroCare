package esprit.dialysisservice.services;

import esprit.dialysisservice.dtos.request.CreateDialysisSessionRequestDTO;
import esprit.dialysisservice.dtos.request.UpdateDialysisSessionRequestDTO;
import esprit.dialysisservice.dtos.response.DialysisSessionResponseDTO;

import java.util.List;
import java.util.UUID;

public interface IDialysisSessionService {

    DialysisSessionResponseDTO createSession(CreateDialysisSessionRequestDTO dto);

    DialysisSessionResponseDTO endSession(UUID sessionId, Double weightAfter, Double postDialysisUrea, Double preDialysisUrea);

    DialysisSessionResponseDTO updateSession(UUID id, UpdateDialysisSessionRequestDTO dto);

    DialysisSessionResponseDTO getSessionById(UUID id);

    List<DialysisSessionResponseDTO> getSessionsByTreatment(UUID treatmentId);

    List<DialysisSessionResponseDTO> getAllSessions();

    void deleteSession(UUID id);

    List<DialysisSessionResponseDTO> getPatientHistory(UUID patientId);

    Double calculateAverageKtV(UUID treatmentId);
}
