package esprit.dialysisservice.controllers;

import esprit.dialysisservice.entities.SystemConfig;
import esprit.dialysisservice.services.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/config")
@RequiredArgsConstructor
public class SystemConfigController {

    private final SystemConfigService service;

    @PreAuthorize("hasAnyRole('admin','ADMIN')")
    @GetMapping
    public SystemConfig get() {
        return service.getOrCreate();
    }

    @PreAuthorize("hasAnyRole('admin','ADMIN')")
    @PutMapping
    public SystemConfig update(@RequestBody SystemConfig dto) {
        return service.update(dto);
    }
}
