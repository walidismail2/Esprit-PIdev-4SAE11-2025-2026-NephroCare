package org.example.hospitalizationservice.service;

import lombok.RequiredArgsConstructor;
import org.example.hospitalizationservice.entities.PatientNutritionProfile;
import org.example.hospitalizationservice.repository.PatientNutritionProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientNutritionProfileService {

    private final PatientNutritionProfileRepository profileRepository;

    // ── Create ────────────────────────────────────────────────────────
    public PatientNutritionProfile create(PatientNutritionProfile profile) {
        if (profileRepository.existsByUserId(profile.getUserId()))
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A nutrition profile already exists for userId: " + profile.getUserId()
            );
        return profileRepository.save(profile);
    }

    // ── Read ──────────────────────────────────────────────────────────
    public List<PatientNutritionProfile> getAll() {
        return profileRepository.findAll();
    }

    public PatientNutritionProfile getById(Long id) {
        return profileRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Profile not found with id: " + id));
    }

    public PatientNutritionProfile getByUserId(String userId) {
        return profileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Profile not found for userId: " + userId));
    }

    // ── Update ────────────────────────────────────────────────────────
    public PatientNutritionProfile update(Long id, PatientNutritionProfile body) {
        PatientNutritionProfile profile = getById(id);

        profile.setFullName(body.getFullName());
        profile.setAge(body.getAge());
        profile.setGender(body.getGender());
        profile.setWeightKg(body.getWeightKg());
        profile.setHeightCm(body.getHeightCm());
        profile.setCkdStage(body.getCkdStage());
        profile.setGfr(body.getGfr());
        profile.setCreatinineLevel(body.getCreatinineLevel());
        profile.setDiabetic(body.isDiabetic());
        profile.setHypertensive(body.isHypertensive());
        profile.setActivityLevel(body.getActivityLevel());

        return profileRepository.save(profile);
    }

    // ── Delete ────────────────────────────────────────────────────────
    public void delete(Long id) {
        if (!profileRepository.existsById(id))
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Profile not found with id: " + id);
        profileRepository.deleteById(id);
    }
}