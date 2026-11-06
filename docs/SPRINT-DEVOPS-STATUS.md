# Sprint DevOps Status

This document tracks sprint progress for:
- Docker generalization
- CI/CD automation
- Kubernetes orchestration and monitoring
- Unit tests and quality robustness

## Delivered in this sprint

### 1) Frontend CI + Sonar quality gate
- Added `.github/workflows/frontend-ci.yml`
- Builds both apps:
  - `frontend/frontoffice`
  - `frontend/Back office`
- Runs unit tests + coverage for backoffice.
- Runs Sonar scan and blocks on Quality Gate (when `SONAR_TOKEN` is set).

Required repository secrets:
- `SONAR_HOST_URL`
- `SONAR_TOKEN`

### 2) Automated CD to Kubernetes
- Added `.github/workflows/cd-k8s.yml`
- Builds and pushes backend images to GHCR.
- Applies Kubernetes manifest and performs rolling image update.
- Waits for rollout status for all microservices.

Required repository secrets:
- `KUBE_CONFIG_DATA` (base64-encoded kubeconfig content)

### 3) Centralized monitoring + alerting
- Added `k8s/monitoring-stack.yaml`:
  - Prometheus
  - Alertmanager
  - Grafana
  - Basic alert rules (`ServiceDown`)

Ports:
- Prometheus: `30090`
- Grafana: `30300` (admin/admin by default, change in production)

## In progress (quality robustness)

### Unit tests reinforcement
- CI enforces backend tests and front build/test baseline.
- Next step: increase business test coverage per service/module.

### Quality hardening
- Sonar quality gate integrated in frontend CI.
- Next step: add backend Sonar gate (and optional Jacoco thresholds).

## Quick start

```powershell
# Apply monitoring stack
kubectl apply -f .\k8s\monitoring-stack.yaml

# Check monitoring pods
kubectl -n monitoring get pods
```
