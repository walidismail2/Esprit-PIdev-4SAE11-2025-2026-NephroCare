import { KeycloakService } from 'keycloak-angular';
import keycloakConfig from './keycloak.config';

export function initializeKeycloak(keycloak: KeycloakService) {
    return () =>
        keycloak.init({
            config: keycloakConfig,
            initOptions: {
                onLoad: 'login-required',
                checkLoginIframe: false,
                pkceMethod: 'S256',
            },
            enableBearerInterceptor: false, // because you use your own interceptor
            // ✅ exclure le pharmacy service du token Bearer
            bearerExcludedUrls: [
                'http://localhost:8070/pharmacy',
                'http://localhost:8070/pharmacy/api',
                'http://localhost:8070/pharmacy/api/stock',
            ],
        });
}