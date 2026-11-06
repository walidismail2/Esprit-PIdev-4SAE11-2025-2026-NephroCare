package org.example.diagnosticService.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.*; // Import important
import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.example.diagnosticService.enums.*;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiagnosticOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JsonProperty("id")
    private String id;

    @NotNull(message = "Le type de diagnostic est obligatoire")
    @Enumerated(EnumType.STRING)
    @JsonProperty("orderType")
    private DiagnosticOrderType orderType;

    @NotBlank(message = "Le nom du test est obligatoire")
    @Size(min = 2, max = 100, message = "Le nom du test doit faire entre 2 et 100 caractères")
    @JsonProperty("testName")
    private String testName;

    @NotNull(message = "La date de commande est obligatoire")
    @PastOrPresent(message = "La date de commande ne peut pas être dans le futur")
    @Column(columnDefinition = "DATETIME")
    @JsonProperty("orderDate")
    private LocalDateTime orderDate;

    @NotNull(message = "La priorité est obligatoire")
    @Enumerated(EnumType.STRING)
    @JsonProperty("priority")
    private Priority priority;

    @NotNull(message = "Le statut est obligatoire")
    @Enumerated(EnumType.STRING)
    @JsonProperty("status")
    private OrderStatus status;

    @Size(max = 1000, message = "Les notes cliniques ne peuvent pas dépasser 1000 caractères")
    @Column(columnDefinition = "TEXT")
    @JsonProperty("clinicalNotes")
    private String clinicalNotes;

    @NotBlank(message = "L'ID utilisateur est obligatoire")
    @JsonProperty("userId")
    @Column(name = "user_id")
    private String userId;

    @NotBlank(message = "L'ID de consultation est obligatoire")
    @JsonProperty("consultationId")
    private String consultationId;

    @NotBlank(message = "Le nom du demandeur (orderedBy) est obligatoire")
    @JsonProperty("orderedBy")
    private String orderedBy;

    // Setter manuel si Lombok pose toujours problème
    public void setId(String id) {
        this.id = id;
    }
}