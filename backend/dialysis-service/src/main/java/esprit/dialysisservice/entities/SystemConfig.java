package esprit.dialysisservice.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

@Entity
@Table(name = "system_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemConfig {


    @Id
    private Long id;

    @Column(nullable = false)
    private Integer maxConcurrentSessionsPerShift;

    @Column(nullable = false)
    private LocalTime morningStart;

    @Column(nullable = false)
    private LocalTime morningEnd;

    @Column(nullable = false)
    private LocalTime afternoonStart;

    @Column(nullable = false)
    private LocalTime afternoonEnd;

    @Column(nullable = false)
    private Double ktvAlertThreshold;

    public static SystemConfig defaults() {
        return SystemConfig.builder()
                .id(1L)
                .maxConcurrentSessionsPerShift(10)
                .morningStart(LocalTime.of(8, 0))
                .morningEnd(LocalTime.of(12, 0))
                .afternoonStart(LocalTime.of(13, 0))
                .afternoonEnd(LocalTime.of(17, 0))
                .ktvAlertThreshold(1.2)
                .build();
    }
}
