package esprit.dialysisservice.controllers;


import esprit.dialysisservice.dtos.response.NurseResponseDTO;
import esprit.dialysisservice.dtos.response.PatientResponseDTO;
import esprit.dialysisservice.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/patients")
    @PreAuthorize("hasAnyRole('doctor','nurse')")
    public List<PatientResponseDTO> getPatients() {
        return userService.getPatients();
    }
    @GetMapping("/nurses")
    @PreAuthorize("hasRole('doctor')")
    public List<NurseResponseDTO> getNurses() {
        return userService.getNurses();
    }
}
