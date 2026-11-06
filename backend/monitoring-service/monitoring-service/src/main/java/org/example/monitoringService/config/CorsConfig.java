package org.example.monitoringService.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {

            @Override
            public void addCorsMappings(CorsRegistry registry) {

                registry.addMapping("/**")
                        // 🔥 Angular frontend
                        .allowedOriginPatterns("http://localhost:4200")

                        // ✔️ toutes les méthodes HTTP
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")

                        // ✔️ headers autorisés
                        .allowedHeaders("*")

                        // 🔥 important si tu utilises auth/cookies
                        .allowCredentials(true);
            }
        };
    }
}