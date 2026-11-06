package org.example.hospitalizationservice.entities;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.ALWAYS)

// ✅ FIX 1: replaced @Data with explicit annotations.
//
//    @Data generates toString() that includes EVERY field.
//    When anything in the request called toString() on a Hospitalization
//    (Hibernate dirty-check, a log statement, the diet service, etc.),
//    it accessed vitalSignsRecords and nutritionPlan, initializing both
//    lazy proxies and firing extra SELECT queries.
//
//    @EqualsAndHashCode(onlyExplicitlyIncluded = true) + @EqualsAndHashCode.Include
//    on the id field is also the correct JPA pattern: entity identity is the
//    database id, not the value of every column.

@ToString(exclude = {"vitalSignsRecords", "nutritionPlan"})
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Hospitalization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include          // identity based on id only
    private Long id;

    @NotNull(message = "Admission date is required")
    @PastOrPresent(message = "Admission date cannot be in the future")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime admissionDate;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dischargeDate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "room_id", nullable = false)
    @NotNull(message = "Room is required")
    private Room room;

    @NotBlank(message = "Admission reason is required")
    @Size(max = 255, message = "Admission reason cannot exceed 255 characters")
    private String admissionReason;

    @NotBlank(message = "Status is required")
    @Pattern(
            regexp = "^(pending|active|discharged)$",
            message = "Status must be 'pending', 'active' or 'discharged'"
    )
    private String status;

    @NotBlank(message = "User ID is required")
    private String userId;

    @NotBlank(message = "Attending doctor ID is required")
    private String attendingDoctorId;

    // @OneToMany already defaults to LAZY — no change needed here.
    // The only reason it was loading before was toString() above.
    @OneToMany(mappedBy = "hospitalization", cascade = CascadeType.ALL, orphanRemoval = true,
            fetch = FetchType.EAGER)  // ← add this
    @JsonManagedReference
    private List<VitalSigns> vitalSignsRecords = new ArrayList<>();

    // ✅ FIX 2: fetch = FetchType.LAZY added.
    //    @OneToOne defaults to EAGER — this was causing Hibernate to LEFT JOIN
    //    the NutritionPlan table on every single Hospitalization query, even
    //    when the plan was never needed (e.g. just fetching the hosp to read userId).
    //    With LAZY, the join only happens if nutritionPlan is explicitly accessed.
    //    @JsonManagedReference("hosp-nutrition") kept as-is — it is still needed
    //    for the hospitalization list/detail endpoints that do return the plan.
    @OneToOne(mappedBy = "hospitalization", cascade = CascadeType.ALL,
            orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference("hosp-nutrition")
    private NutritionPlan nutritionPlan;
}