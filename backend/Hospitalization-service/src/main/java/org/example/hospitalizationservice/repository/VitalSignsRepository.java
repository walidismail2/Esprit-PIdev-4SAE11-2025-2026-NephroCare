package org.example.hospitalizationservice.repository;

import org.example.hospitalizationservice.entities.VitalSigns;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VitalSignsRepository extends JpaRepository<VitalSigns, Long> {
}
