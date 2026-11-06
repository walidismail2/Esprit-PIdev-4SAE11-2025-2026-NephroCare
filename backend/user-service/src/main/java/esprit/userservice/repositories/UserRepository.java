package esprit.userservice.repositories;


import esprit.userservice.entities.User;
import esprit.userservice.entities.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByKeycloakId(String keycloakId);
    Boolean existsByUsername(String username);
    List<User> findByRole(Role role);
}