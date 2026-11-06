package esprit.userservice.dto;

import esprit.userservice.entities.User;

public record UserView(
        Long id,
        String keycloakId,
        String username,
        String email,
        String firstName,
        String lastName,
        String role
) {
    public static UserView from(User user) {
        return new UserView(
                user.getId(),
                user.getKeycloakId(),
                user.getUsername(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole() == null ? null : user.getRole().name()
        );
    }
}
