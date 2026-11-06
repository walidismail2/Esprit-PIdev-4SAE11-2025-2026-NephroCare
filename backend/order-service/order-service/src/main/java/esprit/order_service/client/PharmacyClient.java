package esprit.order_service.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;

@Component
public class PharmacyClient {

    private final RestTemplate restTemplate;
    private final String pharmacyBaseUrl;

    public PharmacyClient(
            RestTemplate restTemplate,
            @Value("${pharmacy.service.base-url:http://localhost:8087}") String pharmacyBaseUrl
    ) {
        this.restTemplate = restTemplate;
        this.pharmacyBaseUrl = pharmacyBaseUrl;
    }

    public PharmacyMedication getMedication(String id) {
        return restTemplate.exchange(
                pharmacyBaseUrl + "/api/medications/" + id,
                HttpMethod.GET,
                new HttpEntity<>(headers()),
                PharmacyMedication.class
        ).getBody();
    }

    public void decrementStock(String medicationId, int quantity, String orderId) {
        Map<String, Object> body = Map.of(
                "quantityChange", -quantity,
                "reason", "PRESCRIPTION_DISPENSED",
                "notes", "Order " + orderId,
                "performedBy", "order-service"
        );
        restTemplate.exchange(
                pharmacyBaseUrl + "/api/stock/medications/" + medicationId,
                HttpMethod.PATCH,
                new HttpEntity<>(body, headers()),
                Void.class
        );
    }

    private HttpHeaders headers() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            String authorization = attributes.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
            if (authorization != null && !authorization.isBlank()) {
                headers.set(HttpHeaders.AUTHORIZATION, authorization);
            }
        }
        return headers;
    }
}
