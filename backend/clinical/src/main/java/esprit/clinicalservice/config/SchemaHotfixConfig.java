package esprit.clinicalservice.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class SchemaHotfixConfig {

    private static final Logger logger = LoggerFactory.getLogger(SchemaHotfixConfig.class);

    private final JdbcTemplate jdbcTemplate;

    public SchemaHotfixConfig(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void applyEnumToVarcharHotfix() {
        try {
            jdbcTemplate.execute(
                    "ALTER TABLE triage_escalation_events " +
                    "MODIFY COLUMN escalation_type VARCHAR(32) NOT NULL"
            );
            logger.info("Applied hotfix: triage_escalation_events.escalation_type -> VARCHAR(32)");
        } catch (Exception ex) {
            logger.warn("Hotfix skipped for triage_escalation_events.escalation_type: {}", ex.getMessage());
        }

        try {
            jdbcTemplate.execute(
                    "ALTER TABLE triage_queue_items " +
                    "MODIFY COLUMN last_escalation_type VARCHAR(32) NULL"
            );
            logger.info("Applied hotfix: triage_queue_items.last_escalation_type -> VARCHAR(32)");
        } catch (Exception ex) {
            logger.warn("Hotfix skipped for triage_queue_items.last_escalation_type: {}", ex.getMessage());
        }

        try {
            jdbcTemplate.execute(
                    "ALTER TABLE triage_queue_items " +
                    "ADD COLUMN IF NOT EXISTS sepsis_alert TINYINT(1) NOT NULL DEFAULT 0"
            );
            jdbcTemplate.execute(
                    "UPDATE triage_queue_items SET sepsis_alert = 0 WHERE sepsis_alert IS NULL"
            );
            logger.info("Applied hotfix: triage_queue_items.sepsis_alert added/defaulted");
        } catch (Exception ex) {
            logger.warn("Hotfix skipped for triage_queue_items.sepsis_alert: {}", ex.getMessage());
        }

        try {
            jdbcTemplate.execute(
                    "ALTER TABLE consultations " +
                    "MODIFY COLUMN doctor_id BIGINT NULL"
            );
            logger.info("Applied hotfix: consultations.doctor_id -> BIGINT NULL");
        } catch (Exception ex) {
            logger.warn("Hotfix skipped for consultations.doctor_id: {}", ex.getMessage());
        }
    }
}
