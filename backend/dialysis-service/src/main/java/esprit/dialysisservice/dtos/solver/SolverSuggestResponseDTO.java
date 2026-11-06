package esprit.dialysisservice.dtos.solver;


import java.util.ArrayList;
import java.util.List;

public class SolverSuggestResponseDTO {
    private boolean feasible;
    private List<ProposedSlotDTO> plan = new ArrayList<>();
    private List<ViolationDTO> violations = new ArrayList<>();

    public SolverSuggestResponseDTO() {}

    public SolverSuggestResponseDTO(boolean feasible, List<ProposedSlotDTO> plan, List<ViolationDTO> violations) {
        this.feasible = feasible;
        this.plan = plan == null ? new ArrayList<>() : plan;
        this.violations = violations == null ? new ArrayList<>() : violations;
    }

    public boolean isFeasible() { return feasible; }
    public void setFeasible(boolean feasible) { this.feasible = feasible; }

    public List<ProposedSlotDTO> getPlan() { return plan; }
    public void setPlan(List<ProposedSlotDTO> plan) { this.plan = plan; }

    public List<ViolationDTO> getViolations() { return violations; }
    public void setViolations(List<ViolationDTO> violations) { this.violations = violations; }
}