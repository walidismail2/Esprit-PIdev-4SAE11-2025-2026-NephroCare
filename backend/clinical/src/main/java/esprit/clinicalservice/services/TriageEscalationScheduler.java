package esprit.clinicalservice.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TriageEscalationScheduler {

    private static final Logger logger = LoggerFactory.getLogger(TriageEscalationScheduler.class);

    private final TriageService triageService;

    public TriageEscalationScheduler(TriageService triageService) {
        this.triageService = triageService;
    }

    @Scheduled(fixedDelayString = "${triage.escalation.fixed-delay-ms:60000}")
    public void runEscalationSweep() {
        // This log line appears in the terminal when the escalation scheduler runs.
        logger.info("Triage escalation sweep started");
        triageService.processOverdueEscalations();
    }
}
