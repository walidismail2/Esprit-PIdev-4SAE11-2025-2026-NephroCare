import { environment } from '../environments/environment';

const keycloakConfig = {
  url: environment.keycloakUrl,
  realm: environment.realm,
  clientId: environment.clientId
};

export default keycloakConfig;

