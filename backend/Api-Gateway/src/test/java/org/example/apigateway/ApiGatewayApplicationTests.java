package org.example.apigateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;

@SpringBootTest(properties = {
		"eureka.client.enabled=false",
		"spring.cloud.discovery.enabled=false"
})
class ApiGatewayApplicationTests {

	@MockBean
	ReactiveJwtDecoder jwtDecoder;

	@Test
	void contextLoads() {
	}

}
