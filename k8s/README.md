## Run NephroCare backend on Kubernetes (local images)

This folder deploys the backend stack into Kubernetes namespace `nephrocare`.

### 1) Build backend Docker images (local)

From `backend/`:

```powershell
Set-Location .\backend

docker build -t nephrocare/discovery-service:local --build-arg SERVICE_PATH=discovery-service .
docker build -t nephrocare/config-server:local     --build-arg SERVICE_PATH=config .
docker build -t nephrocare/api-gateway:local       --build-arg SERVICE_PATH=Api-Gateway .

docker build -t nephrocare/user-service:local              --build-arg SERVICE_PATH=user-service .
docker build -t nephrocare/clinical-service:local          --build-arg SERVICE_PATH=clinical .
docker build -t nephrocare/diagnostic-service:local        --build-arg SERVICE_PATH=diagnostic-service .
docker build -t nephrocare/dialysis-service:local          --build-arg SERVICE_PATH=dialysis-service .
docker build -t nephrocare/hospitalization-service:local   --build-arg SERVICE_PATH=Hospitalization-service .
docker build -t nephrocare/order-service:local             --build-arg SERVICE_PATH=order-service/order-service .
docker build -t nephrocare/pharmacy-service:local          --build-arg SERVICE_PATH=pharmacy-service .
docker build -t nephrocare/monitoring-service:local         --build-arg SERVICE_PATH=monitoring-service/monitoring-service .
```

### 2) Apply Kubernetes manifests

```powershell
Set-Location ..
kubectl apply -f .\k8s\nephrocare-backend.yaml
```

### 3) Access from your local frontend (recommended: port-forward)

- API Gateway: `http://localhost:8070`
- Keycloak: `http://localhost:8180`
- Frontoffice UI: `http://localhost:4200`
- Backoffice UI: `http://localhost:4369`

### Runbook (close / reopen everything)

See `k8s/RUNBOOK.md`.

#### If NodePort is not reachable on Windows

On some Docker Desktop + WSL2 setups, NodePort ports may not be reachable from the Windows host.
Use port-forward instead (keep this terminal open):

```powershell
kubectl -n nephrocare port-forward svc/api-gateway 8070:8070
kubectl -n nephrocare port-forward svc/frontoffice-ui 4200:80
kubectl -n nephrocare port-forward svc/backoffice-ui 4369:80
```

And if you need Keycloak locally:

```powershell
kubectl -n nephrocare port-forward svc/keycloak 8180:8180
```

### MySQL init note (first bootstrap)

`nephrocare-backend.yaml` now mounts SQL init scripts to `/docker-entrypoint-initdb.d`.
These scripts run only when MySQL initializes an empty data directory.

If MySQL was already created before this change, reset MySQL data once:

```powershell
kubectl -n nephrocare delete deploy/mysql
kubectl -n nephrocare delete pvc/mysql-pvc
kubectl apply -f .\k8s\nephrocare-backend.yaml
```

Then verify:

```powershell
kubectl -n nephrocare get pods
kubectl -n nephrocare logs deploy/mysql --tail=100
```

