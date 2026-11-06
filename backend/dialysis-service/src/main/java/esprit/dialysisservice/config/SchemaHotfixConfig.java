package esprit.dialysisservice.config;

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
                    "ALTER TABLE dialysis_treatments " +
                    "MODIFY COLUMN vascular_access_type VARCHAR(50) NULL"
            );
            logger.info("Applied hotfix: dialysis_treatments.vascular_access_type -> VARCHAR(50)");
        } catch (Exception ex) {
            logger.warn(
                    "Hotfix skipped for dialysis_treatments.vascular_access_type: {}",
                    ex.getMessage()
            );
        }

        try {
            jdbcTemplate.execute(
                    "ALTER TABLE session_report " +
                    "MODIFY COLUMN report_text LONGTEXT NOT NULL"
            );
            logger.info("Applied hotfix: session_report.report_text -> LONGTEXT");
        } catch (Exception ex) {
            logger.warn(
                    "Hotfix skipped for session_report.report_text: {}",
                    ex.getMessage()
            );
        }
    }
}
