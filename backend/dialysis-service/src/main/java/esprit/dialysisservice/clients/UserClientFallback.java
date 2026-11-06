package esprit.dialysisservice.clients;



import esprit.dialysisservice.dtos.response.UserResponseDTO;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class UserClientFallback implements UserClient {
    @Override
    public UserResponseDTO getUserById(UUID id) {
        // Return a default object
        UserResponseDTO dto = new UserResponseDTO();
        dto.setId(id);
        dto.setFirstName("Unknown");
        dto.setLastName("Patient");
        return dto;
    }
}