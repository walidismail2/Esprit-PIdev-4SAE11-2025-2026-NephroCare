package esprit.dialysisservice.services;


import esprit.dialysisservice.dtos.response.PatientResponseDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class UserLabelService {

    private final UserService userService;

    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public String label(UUID userId) {
        if (userId == null) return "-";
        String id = userId.toString();

        return cache.computeIfAbsent(id, key -> {
            try {
                PatientResponseDTO dto = userService.getUserById(key);
                if (dto != null && dto.getFullName() != null && !dto.getFullName().isBlank()) {
                    return dto.getFullName();
                }
            } catch (Exception ignored) {}
            return key; // fallback to UUID
        });
    }
}