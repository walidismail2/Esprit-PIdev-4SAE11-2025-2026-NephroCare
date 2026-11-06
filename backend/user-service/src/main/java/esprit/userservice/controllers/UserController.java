package esprit.userservice.controllers;

import esprit.userservice.dto.UserView;
import esprit.userservice.entities.User;
import esprit.userservice.entities.enums.Role;
import esprit.userservice.services.UserDirectoryService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserDirectoryService directory;

    public UserController(UserDirectoryService directory) {
        this.directory = directory;
    }

    @GetMapping("/profile")
    public String getProfile(@AuthenticationPrincipal Jwt jwt) {
        User user = directory.syncFromToken(jwt);
        return "Hello " + user.getUsername() + " (ID: " + user.getId() + ")";
    }

    @GetMapping("/patient-ids")
    public List<Long> patientIds() {
        return directory.idsByRole(Role.PATIENT);
    }

    @GetMapping("/doctor-ids")
    public List<Long> doctorIds() {
        return directory.idsByRole(Role.DOCTOR);
    }

    @GetMapping
    public List<UserView> list() {
        return directory.all();
    }

    @GetMapping("/{id}")
    public UserView getById(@PathVariable String id) {
        return directory.getById(id);
    }
}
