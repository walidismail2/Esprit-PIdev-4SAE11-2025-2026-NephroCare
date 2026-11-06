package esprit.dialysisservice.bootstrap;

import esprit.dialysisservice.entities.SystemConfig;
import esprit.dialysisservice.services.SessionReportService;
import esprit.dialysisservice.services.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ReportsBackfillRunner implements CommandLineRunner {

    private final SessionReportService reportService;
    private final SystemConfigService systemConfigService;

    @Value("${dialysis.reports.backfill:false}")
    private boolean enabled;

    // put any UUID here (admin/doctor id). Use your doctor id if you want:
    @Value("${dialysis.reports.backfill.generatedBy:30b885d2-3aec-431a-85d3-7d3b143b02c8}")
    private String generatedBy;

    @Override
    public void run(String... args) {
        if (!enabled) return;

        SystemConfig cfg = systemConfigService.getOrCreate();
        int created = reportService.backfillMissingReports(cfg, UUID.fromString(generatedBy));

        System.out.println("[BACKFILL] created reports = " + created);
    }
}