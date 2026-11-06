package esprit.pharmacy_service.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import esprit.pharmacy_service.entity.Enumerations.MedicationRoute;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Medication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @JsonProperty
    private String medicationName;

    @JsonProperty
    private String dosage;

    @JsonProperty
    private Integer frequency;

    @Enumerated(EnumType.STRING)
    @JsonProperty
    private MedicationRoute route;

    @JsonProperty
    private Integer duration;

    @JsonProperty
    private Integer quantity;

    @JsonProperty
    private Double unitPrice;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @JsonProperty
    private LocalDate startDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @JsonProperty
    private LocalDate endDate;

    @JsonProperty
    private String userId;

    @ManyToOne
    @JoinColumn(name = "prescription_id")
    @JsonIgnore
    private Prescription prescription;
}
