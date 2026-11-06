package esprit.clinicalservice.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TriageStalledInProgressScheduler {

    private static final Logger logger = LoggerFactory.getLogger(TriageStalledInProgressScheduler.class);

    private final TriageService triageService;

    public TriageStalledInProgressScheduler(TriageService triageService) {
        this.triageService = triageService;
    }

    @Scheduled(fixedDelayString = "${triage.progress-monitor.fixed-delay-ms:300000}")
    public void runStalledInProgressSweep() {
        // This log line appears in the terminal when the in-progress monitor runs.
        logger.info("Triage stalled-in-progress sweep started");
        triageService.processStalledInProgressItems();
    }
}
