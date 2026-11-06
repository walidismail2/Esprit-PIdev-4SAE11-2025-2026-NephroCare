package esprit.userservice.entities;

import esprit.userservice.entities.enums.Role;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "_user")
// ❌ REMOVE "implements UserDetails"
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // This usually matches the "sub" (Subject ID) from Keycloak or the 'preferred_username'
    @Column(unique = true, nullable = false)
    private String username;

    private String email;

    private String firstName;

    private String lastName;

    @Column(unique = true)
    private String keycloakId;

    @Enumerated(EnumType.STRING)
    private Role role;

    // ❌ REMOVE ALL THE OVERRIDE METHODS BELOW
    // (getAuthorities, getPassword, isAccountNonExpired, etc... DELETE THEM ALL)
}