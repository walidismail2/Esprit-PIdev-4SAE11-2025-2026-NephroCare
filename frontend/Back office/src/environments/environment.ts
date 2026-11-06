export const environment = {
    production: false,
    // Stable local access via kubectl port-forward svc/api-gateway 8070:8070
    apiUrl: 'http://localhost:8070',
    keycloakUrl: 'http://localhost:8180',
    realm: 'nephro-realm',
    clientId: 'backoffice-ui'
};