package esprit.dialysisservice.dtos.solver;

import esprit.dialysisservice.entities.enums.DialysisShift;

import java.time.LocalDate;
import java.util.UUID;

public class ProposedSlotDTO {
    private LocalDate day;
    private DialysisShift shift;
    private UUID nurseId; // optional

    public ProposedSlotDTO() {}

    public ProposedSlotDTO(LocalDate day, DialysisShift shift, UUID nurseId) {
        this.day = day;
        this.shift = shift;
        this.nurseId = nurseId;
    }

    public LocalDate getDay() { return day; }
    public void setDay(LocalDate day) { this.day = day; }

    public DialysisShift getShift() { return shift; }
    public void setShift(DialysisShift shift) { this.shift = shift; }

    public UUID getNurseId() { return nurseId; }
    public void setNurseId(UUID nurseId) { this.nurseId = nurseId; }
}