CREATE TABLE IF NOT EXISTS medical_histories (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    diagnosis TEXT,
    allergies TEXT,
    chronic_conditions TEXT,
    family_history TEXT,
    notes TEXT,
    PRIMARY KEY (id),
    UNIQUE KEY uk_medical_histories_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS consultations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NULL,
    medical_history_id BIGINT NULL,
    consultation_date DATETIME(6) NULL,
    diagnosis VARCHAR(255) NULL,
    treatment_plan TEXT NULL,
    follow_up_date DATE NULL,
    status VARCHAR(255) NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_consultations_medical_history
        FOREIGN KEY (medical_history_id) REFERENCES medical_histories (id)
);

CREATE TABLE IF NOT EXISTS triage_assessments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    patient_id BIGINT NOT NULL,
    arrival_time DATETIME(6) NOT NULL,
    heart_rate INT NULL,
    systolic_bp INT NULL,
    spo2 INT NULL,
    pain_score INT NULL,
    age INT NULL,
    severe_comorbidity TINYINT(1) NULL,
    respiratory_distress TINYINT(1) NULL,
    score INT NOT NULL,
    triage_level VARCHAR(255) NOT NULL,
    recommended_max_wait_minutes INT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS triage_queue_items (
    id BIGINT NOT NULL AUTO_INCREMENT,
    assessment_id BIGINT NOT NULL,
    triage_level VARCHAR(255) NOT NULL,
    priority_rank INT NOT NULL,
    max_wait_minutes INT NOT NULL,
    deadline_at DATETIME(6) NOT NULL,
    status VARCHAR(255) NOT NULL,
    assigned_doctor_id BIGINT NULL,
    started_at DATETIME(6) NULL,
    completed_at DATETIME(6) NULL,
    last_escalation_type VARCHAR(32) NULL,
    last_escalation_at DATETIME(6) NULL,
    manual_override TINYINT(1) NOT NULL,
    override_reason TEXT NULL,
    sepsis_alert TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_triage_queue_assessment (assessment_id),
    CONSTRAINT fk_triage_queue_assessment
        FOREIGN KEY (assessment_id) REFERENCES triage_assessments (id)
);

CREATE TABLE IF NOT EXISTS triage_escalation_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    queue_item_id BIGINT NOT NULL,
    escalation_type VARCHAR(32) NOT NULL,
    message TEXT NOT NULL,
    triggered_at DATETIME(6) NOT NULL,
    acknowledged TINYINT(1) NOT NULL,
    acknowledged_by VARCHAR(255) NULL,
    acknowledged_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_escalation_queue_item
        FOREIGN KEY (queue_item_id) REFERENCES triage_queue_items (id)
);

CREATE TABLE IF NOT EXISTS transplant_candidacy (
    id BIGINT NOT NULL AUTO_INCREMENT,
    patient_id BIGINT NOT NULL,
    candidacy_status VARCHAR(255) NOT NULL,
    eligibility_score INT NULL,
    eligibility_notes TEXT NULL,
    ecd_suitable TINYINT(1) NULL,
    living_donor_suitable TINYINT(1) NULL,
    hla_sensitization_level VARCHAR(255) NULL,
    panel_reactive_antibody INT NULL,
    cardiovascular_clearance TINYINT(1) NULL,
    infectious_disease_clearance TINYINT(1) NULL,
    psychological_clearance TINYINT(1) NULL,
    social_support_assessment TINYINT(1) NULL,
    contraindications TEXT NULL,
    recommended_dialysis_modality VARCHAR(255) NULL,
    waitlist_date DATE NULL,
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    created_by BIGINT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS preoperative_assessments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    patient_id BIGINT NOT NULL,
    assessment_date DATE NULL,
    ecg_result VARCHAR(255) NULL,
    echocardiogram_result VARCHAR(255) NULL,
    stress_test_result VARCHAR(255) NULL,
    ejection_fraction DOUBLE NULL,
    cardiac_clearance TINYINT(1) NULL,
    hiv_status VARCHAR(255) NULL,
    hep_b_status VARCHAR(255) NULL,
    hep_c_status VARCHAR(255) NULL,
    cmv_status VARCHAR(255) NULL,
    ebv_status VARCHAR(255) NULL,
    tb_screening VARCHAR(255) NULL,
    id_clearance TINYINT(1) NULL,
    pulmonary_function_test VARCHAR(255) NULL,
    chest_xray_result VARCHAR(255) NULL,
    pulmonary_clearance TINYINT(1) NULL,
    pre_assessment_creatinine DOUBLE NULL,
    pre_assessment_gfr DOUBLE NULL,
    urine_protein_level VARCHAR(255) NULL,
    psychiatric_evaluation VARCHAR(255) NULL,
    patient_compliance_score INT NULL,
    psychiatric_clearance TINYINT(1) NULL,
    dental_exam_date DATE NULL,
    dental_treatment_needed TINYINT(1) NULL,
    dental_clearance TINYINT(1) NULL,
    overall_risk_score INT NULL,
    assessment_status VARCHAR(255) NULL,
    recommendations TEXT NULL,
    notes TEXT NULL,
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    assessed_by BIGINT NULL,
    PRIMARY KEY (id)
);
