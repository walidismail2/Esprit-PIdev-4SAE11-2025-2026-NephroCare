package esprit.dialysisservice.services;

import esprit.dialysisservice.entities.SystemConfig;

public interface SystemConfigService {
    SystemConfig getOrCreate();
    SystemConfig update(SystemConfig dto);
}
