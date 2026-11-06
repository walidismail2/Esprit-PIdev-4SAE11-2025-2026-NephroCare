package esprit.userservice.services;

import esprit.userservice.dto.UserView;
import esprit.userservice.entities.User;
import esprit.userservice.entities.enums.Role;
import esprit.userservice.repositories.UserRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class UserDirectoryService {

    private final UserRepository userRepository;

    public UserDirectoryService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedDirectory() {
        seed("admin.user", "admin@nephrocare.local", "Admin", "User", Role.ADMIN);
        seed("doctor.user", "doctor@nephrocare.local", "Doctor", "User", Role.DOCTOR);
        seed("nurse.user", "nurse@nephrocare.local", "Nurse", "User", Role.NURSE);
        seed("pharmacist.user", "pharmacist@nephrocare.local", "Pharmacist", "User", Role.PHARMACIST);
        seed("labtech.user", "labtech@nephrocare.local", "Lab", "Tech", Role.LAB_TECH);
        seed("driver.user", "driver@nephrocare.local", "Driver", "User", Role.DRIVER);
        seed("patient.user", "patient@nephrocare.local", "Patient", "User", Role.PATIENT);
    }

    @Transactional
    public User syncFromToken(Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        if (username == null || username.isBlank()) {
            username = jwt.getSubject();
        }
        User user = userRepository.findByUsername(username).orElseGet(User::new);
        user.setUsername(username);
        user.setKeycloakId(jwt.getSubject());
        user.setEmail(jwt.getClaimAsString("email"));
        user.setFirstName(jwt.getClaimAsString("given_name"));
        user.setLastName(jwt.getClaimAsString("family_name"));
        Role role = roleFromToken(jwt);
        if (role != null) {
            user.setRole(role);
        } else if (user.getRole() == null) {
            user.setRole(Role.PATIENT);
        }
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public List<Long> idsByRole(Role role) {
        return userRepository.findByRole(role).stream().map(User::getId).toList();
    }

    @Transactional(readOnly = true)
    public List<UserView> all() {
        return userRepository.findAll().stream().map(UserView::from).toList();
    }

    @Transactional(readOnly = true)
    public UserView getById(String id) {
        Optional<User> user = id.chars().allMatch(Character::isDigit)
                ? userRepository.findById(Long.parseLong(id))
                : userRepository.findByKeycloakId(id);
        return user.map(UserView::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private void seed(String username, String email, String firstName, String lastName, Role role) {
        if (userRepository.existsByUsername(username)) {
            return;
        }
        userRepository.save(User.builder()
                .username(username)
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .role(role)
                .build());
    }

    private Role roleFromToken(Jwt jwt) {
        Object realmAccess = jwt.getClaim("realm_access");
        if (!(realmAccess instanceof Map<?, ?> access)) {
            return null;
        }
        Object rawRoles = access.get("roles");
        if (!(rawRoles instanceof List<?> roles)) {
            return null;
        }
        for (Object role : roles) {
            if (role == null) {
                continue;
            }
            Role mapped = mapRole(role.toString());
            if (mapped != null) {
                return mapped;
            }
        }
        return null;
    }

    private Role mapRole(String role) {
        return switch (role.toLowerCase(Locale.ROOT)) {
            case "admin" -> Role.ADMIN;
            case "doctor" -> Role.DOCTOR;
            case "nurse" -> Role.NURSE;
            case "pharmacist" -> Role.PHARMACIST;
            case "lab-tech", "labtech", "lab_tech" -> Role.LAB_TECH;
            case "driver" -> Role.DRIVER;
            case "patient" -> Role.PATIENT;
            case "radiologist" -> Role.RADIOLOGIST;
            default -> null;
        };
    }
}
