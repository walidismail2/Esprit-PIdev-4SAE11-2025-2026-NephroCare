package org.example.hospitalizationservice.service;

import org.example.hospitalizationservice.entities.VitalSigns;
import org.example.hospitalizationservice.repository.VitalSignsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VitalSignsService {

    @Autowired
    private VitalSignsRepository repository;

    public List<VitalSigns> findAll() {
        return repository.findAll();
    }

    public VitalSigns findById(Long id) {
        return repository.findById(id).orElse(null);
    }

    public VitalSigns save(VitalSigns vitalSigns) {
        return repository.save(vitalSigns);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
