package esprit.dialysisservice.services;

import esprit.dialysisservice.dtos.response.NurseResponseDTO;
import esprit.dialysisservice.dtos.response.PatientResponseDTO;
import lombok.RequiredArgsConstructor;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final Keycloak keycloak;

    @Value("${keycloak.realm}")
    private String realm;

    @Override
    public List<PatientResponseDTO> getPatients() {
        RealmResource rr = keycloak.realm(realm);

        // Members of realm role "patient"
        var users = rr.roles().get("patient").getRoleUserMembers();
        return users.stream().map(this::toPatient).toList();
    }
    @Override
    public List<NurseResponseDTO> getNurses() {
        RealmResource rr = keycloak.realm(realm);

        // Members of realm role "patient"
        var users = rr.roles().get("nurse").getRoleUserMembers();
        return users.stream().map(this::toNurse).toList();
    }

    @Override
    public PatientResponseDTO getUserById(String userId) {
        RealmResource rr = keycloak.realm(realm);
        UserRepresentation u = rr.users().get(userId).toRepresentation();
        return toPatient(u);
    }

    private PatientResponseDTO toPatient(UserRepresentation u) {
        String first = u.getFirstName() == null ? "" : u.getFirstName().trim();
        String last  = u.getLastName() == null ? "" : u.getLastName().trim();

        String fullName = (first + " " + last).trim();
        if (fullName.isBlank()) fullName = u.getUsername(); // fallback

        return new PatientResponseDTO(u.getId(), fullName, u.getEmail());
    }
    private NurseResponseDTO toNurse(UserRepresentation u) {
        String first = u.getFirstName() == null ? "" : u.getFirstName().trim();
        String last  = u.getLastName() == null ? "" : u.getLastName().trim();

        String fullName = (first + " " + last).trim();
        if (fullName.isBlank()) fullName = u.getUsername(); // fallback

        return new NurseResponseDTO(u.getId(), fullName, u.getEmail());
    }
}
