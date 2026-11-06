package org.example.hospitalizationservice.repository;

import org.example.hospitalizationservice.entities.PatientNutritionProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PatientNutritionProfileRepository extends JpaRepository<PatientNutritionProfile, Long> {

    Optional<PatientNutritionProfile> findByUserId(String userId);

    boolean existsByUserId(String userId);
}