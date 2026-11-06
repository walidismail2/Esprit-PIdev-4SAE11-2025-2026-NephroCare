package esprit.clinicalservice.config;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class GeminiChatClient {

    private final RestClient restClient;
    private final String model;
    private final boolean configured;

    public GeminiChatClient(
            @Value("${spring.ai.openai.api-key:}") String apiKey,
            @Value("${spring.ai.openai.chat.options.model:gemini-2.5-flash}") String model) {
        this.model = model;
        this.configured = apiKey != null && !apiKey.isBlank();
        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta/openai")
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader("x-goog-api-key", apiKey)
                .build();
    }

    public boolean isConfigured() {
        return configured;
    }

    public String complete(String prompt) {
        JsonNode response = restClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "model", model,
                        "messages", List.of(Map.of("role", "user", "content", prompt))
                ))
                .retrieve()
                .body(JsonNode.class);
        if (response == null) {
            throw new IllegalStateException("Gemini returned an empty response");
        }
        return response.path("choices").path(0).path("message").path("content").asText("");
    }
}
