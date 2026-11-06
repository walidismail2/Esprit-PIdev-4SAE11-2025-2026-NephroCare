package org.example.apigateway;

import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayConfig {
    // CORS is centrally configured in application.yml (spring.cloud.gateway.globalcors).
    // Keeping a single source of truth avoids duplicate Access-Control-Allow-Origin headers.
}