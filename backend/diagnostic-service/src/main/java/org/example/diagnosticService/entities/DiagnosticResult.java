package org.example.diagnosticService.entities;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.*; // Import indispensable
import lombok.*;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DiagnosticResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JsonProperty("id")
    private String id;

    @Size(max = 2000, message = "L'interprétation de l'image est trop longue (max 2000 caractères)")
    @Column(columnDefinition = "TEXT")
    @JsonProperty("imageInterpretation")
    private String imageInterpretation;

    @JsonProperty("isAbnormal")
    private boolean isAbnormal; // Un boolean primitif n'est jamais null (false par défaut)

    @Size(max = 2000, message = "Les conclusions de laboratoire sont trop longues")
    @Column(columnDefinition = "TEXT")
    @JsonProperty("labFindings")
    private String labFindings;

    @NotBlank(message = "Le nom du professionnel ayant réalisé l'examen est obligatoire")
    @JsonProperty("performedBy")
    private String performedBy;

    @NotBlank(message = "La plage de référence est obligatoire")
    @JsonProperty("referenceRange")
    private String referenceRange;

    @NotNull(message = "La date du résultat est obligatoire")
    @PastOrPresent(message = "La date du résultat ne peut pas être dans le futur")
    @Column(columnDefinition = "DATETIME")
    @JsonProperty("resultDate")
    private LocalDateTime resultDate;

    @NotBlank(message = "Les valeurs du résultat sont obligatoires")
    @Column(name = "result_values")
    @JsonProperty("resultValues")
    private String resultValues;

    @NotBlank(message = "L'ID de la commande (orderId) est obligatoire")
    @JsonProperty("orderId")
    private String orderId;

    // AJOUT MANUEL DU SETTER POUR RÉPARER LE CONTROLLER (Update)
    public void setId(String id) {
        this.id = id;
    }
}