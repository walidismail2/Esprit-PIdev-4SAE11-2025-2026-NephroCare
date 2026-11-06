package org.example.apigateway.config;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/**
 * SockJS cannot set an Authorization header. The alert socket passes the Keycloak
 * access token as a query parameter, and this filter copies it before JWT checks.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AccessTokenQueryFilter implements WebFilter {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        if (path == null || !path.startsWith("/ws-alerts")) {
            return chain.filter(exchange);
        }
        if (exchange.getRequest().getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
            return chain.filter(exchange);
        }
        String token = exchange.getRequest().getQueryParams().getFirst("access_token");
        if (token == null || token.isBlank()) {
            return chain.filter(exchange);
        }
        ServerWebExchange authenticated = exchange.mutate()
                .request(exchange.getRequest().mutate()
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .build())
                .build();
        return chain.filter(authenticated);
    }
}
