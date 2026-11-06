package esprit.clinicalservice.config;

import org.springframework.ai.openai.OpenAiChatClient;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClient;

@Configuration
public class OpenAiConfig {

    @Value("${spring.ai.openai.api-key:}")
    private String apiKey;

    @Value("${spring.ai.openai.chat.options.model:gemini-2.5-flash}")
    private String model;

    @Bean
    public OpenAiChatClient openAiChatClient() {
        System.out.println(">>> Building OpenAiChatClient with key: " +
                (apiKey != null && apiKey.length() > 5 ? apiKey.substring(0, 8) + "..." : "EMPTY"));

        RestClient.Builder restClientBuilder = RestClient.builder()
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader("x-goog-api-key", apiKey);

        OpenAiApi openAiApi = new OpenAiApi(
                "https://generativelanguage.googleapis.com/v1beta/openai",
                apiKey,
                restClientBuilder
        );

        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .withModel(model)
                .build();

        return new OpenAiChatClient(openAiApi, options);
    }
}