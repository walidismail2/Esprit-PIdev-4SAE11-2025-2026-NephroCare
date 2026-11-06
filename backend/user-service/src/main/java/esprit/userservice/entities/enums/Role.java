package esprit.userservice.entities.enums;

public enum Role {
    ADMIN,          // Manages the system
    DOCTOR,         // Prescribes, Diagnoses, Creates Treatments
    NURSE,          // Executes Dialysis, Records Vitals
    PHARMACIST,     // Manages Stock, Dispenses Meds
    RADIOLOGIST,    // Validates Imaging
    LAB_TECH,       // Enters Lab Results
    DRIVER,         // Delivers pharmacy orders
    PATIENT         // Views their own portal
}
