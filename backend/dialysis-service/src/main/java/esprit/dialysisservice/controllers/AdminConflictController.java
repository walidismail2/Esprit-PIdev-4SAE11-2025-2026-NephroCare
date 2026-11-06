package esprit.dialysisservice.controllers;


import esprit.dialysisservice.dtos.response.SessionConflictLogDTO;
import esprit.dialysisservice.services.SessionConflictLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/conflicts")
@RequiredArgsConstructor
public class AdminConflictController {

    private final SessionConflictLogService service;

    @PreAuthorize("hasAnyRole('admin','ADMIN')")
    @GetMapping
    public List<SessionConflictLogDTO> list() {
        return service.listAll();
    }
}
