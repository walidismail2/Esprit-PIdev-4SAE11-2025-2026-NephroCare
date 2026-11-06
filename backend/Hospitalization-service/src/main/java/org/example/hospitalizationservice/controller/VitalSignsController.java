package org.example.hospitalizationservice.controller;

import org.example.hospitalizationservice.entities.VitalSigns;
import org.example.hospitalizationservice.service.VitalSignsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vital-signs")
public class VitalSignsController {

    @Autowired
    private VitalSignsService service;

    @GetMapping
    public List<VitalSigns> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public VitalSigns getById(@PathVariable Long id) {  // <-- Fixed type
        return service.findById(id);
    }

    @PostMapping
    public VitalSigns create(@RequestBody VitalSigns vitalSigns) {
        return service.save(vitalSigns);
    }

    @PutMapping("/{id}")
    public VitalSigns update(@PathVariable Long id, @RequestBody VitalSigns vitalSigns) {
        vitalSigns.setId(id);
        return service.save(vitalSigns);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {  // <-- Fixed type
        service.deleteById(id);
    }
}
