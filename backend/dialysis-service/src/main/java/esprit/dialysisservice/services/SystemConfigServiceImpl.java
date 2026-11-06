package esprit.dialysisservice.services;


import esprit.dialysisservice.entities.SystemConfig;
import esprit.dialysisservice.repositories.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;

@Service
@RequiredArgsConstructor
public class SystemConfigServiceImpl implements SystemConfigService {

    private final SystemConfigRepository repo;

    @Override
    @Transactional
    public SystemConfig getOrCreate() {
        return repo.findTopByOrderByIdAsc()
                .orElseGet(() -> repo.save(SystemConfig.defaults()));
    }

    @Override
    @Transactional
    public SystemConfig update(SystemConfig dto) {
        SystemConfig cfg = getOrCreate();

        Integer cap = cfg.getMaxConcurrentSessionsPerShift();
        if (dto.getMaxConcurrentSessionsPerShift() != null) {
            int v = dto.getMaxConcurrentSessionsPerShift();
            if (v <= 0) throw new IllegalStateException("maxConcurrentSessionsPerShift must be > 0");
            cfg.setMaxConcurrentSessionsPerShift(v);
        }

        if (dto.getMorningStart() != null) cfg.setMorningStart(dto.getMorningStart());
        if (dto.getMorningEnd() != null) cfg.setMorningEnd(dto.getMorningEnd());
        if (dto.getAfternoonStart() != null) cfg.setAfternoonStart(dto.getAfternoonStart());
        if (dto.getAfternoonEnd() != null) cfg.setAfternoonEnd(dto.getAfternoonEnd());

        if (dto.getKtvAlertThreshold() != null) {
            double th = dto.getKtvAlertThreshold();
            if (th <= 0) throw new IllegalStateException("ktvAlertThreshold must be > 0");
            cfg.setKtvAlertThreshold(th);
        }

        validate(cfg);
        return repo.save(cfg);
    }

    private void validate(SystemConfig cfg) {
        if (cfg.getMorningStart() == null || cfg.getMorningEnd() == null ||
                cfg.getAfternoonStart() == null || cfg.getAfternoonEnd() == null) {
            throw new IllegalStateException("All shift times are required");
        }

        var ms = cfg.getMorningStart();
        var me = cfg.getMorningEnd();
        var as = cfg.getAfternoonStart();
        var ae = cfg.getAfternoonEnd();

        if (!ms.isBefore(me)) throw new IllegalStateException("Morning start must be before morning end");
        if (!as.isBefore(ae)) throw new IllegalStateException("Afternoon start must be before afternoon end");
        if (me.isAfter(as)) throw new IllegalStateException("Morning end must be <= Afternoon start (no overlap)");
    }
}

