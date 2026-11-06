package org.example.hospitalizationservice.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Room number is required")
    @Size(max = 20, message = "Room number cannot exceed 20 characters")
    @Column(unique = true, nullable = false)
    private String roomNumber;

    @NotBlank(message = "Room type is required")
    @Pattern(
            regexp = "^(standard|intensive|isolation|pediatric|maternity)$",
            message = "Type must be: standard, intensive, isolation, pediatric or maternity"
    )
    @Column(nullable = false)
    private String type;

    @NotNull(message = "Capacity is required")
    @Min(value = 1, message = "Capacity must be at least 1")
    @Max(value = 10, message = "Capacity cannot exceed 10")
    @Column(nullable = false)
    private Integer capacity;

    @Size(max = 255, message = "Description cannot exceed 255 characters")
    private String description;

    // ── Transient fields — NOT persisted, populated by RoomService ────────
    @Transient
    private boolean available;

    @Transient
    private int currentOccupancy;

    // Hospitalizations are only needed server-side for queries.
    // @JsonIgnore prevents them from appearing in REST responses
    // (which would cause infinite recursion since Hospitalization embeds Room).
    @OneToMany(mappedBy = "room", fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Hospitalization> hospitalizations = new ArrayList<>();
}