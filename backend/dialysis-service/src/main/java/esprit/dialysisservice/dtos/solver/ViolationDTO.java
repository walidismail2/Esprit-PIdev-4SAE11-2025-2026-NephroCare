package esprit.dialysisservice.dtos.solver;

import esprit.dialysisservice.dialysis.solver.ConstraintType;

public class ViolationDTO {
    private ConstraintType type;
    private String message;

    public ViolationDTO() {}

    public ViolationDTO(ConstraintType type, String message) {
        this.type = type;
        this.message = message;
    }

    public ConstraintType getType() { return type; }
    public void setType(ConstraintType type) { this.type = type; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}