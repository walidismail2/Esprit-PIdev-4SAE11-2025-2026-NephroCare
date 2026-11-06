package org.example.hospitalizationservice.service;

import org.example.hospitalizationservice.entities.Hospitalization;
import org.example.hospitalizationservice.repository.HospitalizationRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HospitalizationService {

    private final HospitalizationRepository repository;

    public HospitalizationService(HospitalizationRepository repository) {
        this.repository = repository;
    }

    // Fetch all with room eagerly loaded to avoid LazyInitializationException
    // when Jackson serializes the response
    public List<Hospitalization> findAll() {
        return repository.findAllWithRoom();
    }

    public Hospitalization findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Hospitalization not found: " + id));
    }

    public List<Hospitalization> findByUserId(String userId) {
        return repository.findByUserId(userId);
    }

    public List<Hospitalization> findByStatus(String status) {
        return repository.findByStatus(status);
    }

    public List<Hospitalization> findByRoomId(Long roomId) {
        return repository.findByRoomId(roomId);
    }

    public Hospitalization save(Hospitalization hospitalization) {
        return repository.save(hospitalization);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}