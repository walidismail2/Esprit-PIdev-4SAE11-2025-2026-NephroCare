package esprit.dialysisservice.entities.enums;

public enum NotificationType {
    SCHEDULE_REQUEST,       // nurse gets assignment request
    SCHEDULE_ACCEPTED,      // doctor/admin informed
    SCHEDULE_REJECTED,      // doctor/admin informed
    SCHEDULE_REASSIGNED,    // doctor/admin + new nurse informed
    SCHEDULE_OVERDUE        // optional (computed in UI)
}