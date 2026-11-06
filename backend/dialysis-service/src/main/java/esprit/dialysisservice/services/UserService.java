package esprit.dialysisservice.services;

import esprit.dialysisservice.dtos.response.NurseResponseDTO;
import esprit.dialysisservice.dtos.response.PatientResponseDTO;
import java.util.List;

public interface UserService {

    List<PatientResponseDTO> getPatients();
    List<NurseResponseDTO> getNurses();

    PatientResponseDTO getUserById(String userId);

}
