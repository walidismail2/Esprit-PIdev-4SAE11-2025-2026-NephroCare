package esprit.clinicalservice.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Collections;
import java.util.List;

@Component
public class UserDirectoryClient {

    private static final Logger logger = LoggerFactory.getLogger(UserDirectoryClient.class);
    private static final ParameterizedTypeReference<List<Long>> LONG_LIST_TYPE =
            new ParameterizedTypeReference<>() {};

    private final RestTemplate restTemplate;
    private final String userServiceBaseUrl;

    public UserDirectoryClient(
            RestTemplate restTemplate,
            @Value("${user.service.base-url:http://localhost:8082/api/users}") String userServiceBaseUrl
    ) {
        this.restTemplate = restTemplate;
        this.userServiceBaseUrl = userServiceBaseUrl;
    }

    public List<Long> getPatientIds() {
        return fetchIds("/patient-ids");
    }

    public List<Long> getDoctorIds() {
        return fetchIds("/doctor-ids");
    }

    private List<Long> fetchIds(String path) {
        String url = userServiceBaseUrl + path;
        try {
            ResponseEntity<List<Long>> response = restTemplate.exchange(
                    url, HttpMethod.GET, authorizationEntity(), LONG_LIST_TYPE);
            return response.getBody() != null ? response.getBody() : Collections.emptyList();
        } catch (Exception ex) {
            logger.error("Failed to fetch IDs from user-service endpoint {}", url, ex);
            return Collections.emptyList();
        }
    }

    private HttpEntity<Void> authorizationEntity() {
        HttpHeaders headers = new HttpHeaders();
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            String authorization = attributes.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
            if (authorization != null && !authorization.isBlank()) {
                headers.set(HttpHeaders.AUTHORIZATION, authorization);
            }
        }
        return new HttpEntity<>(headers);
    }
}
