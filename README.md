# NephroCare

NephroCare is a nephrology platform built for the PIDEV program at Esprit School of Engineering, academic year 2025-2026. Staff and patients use two Angular applications. Clinical data lives in Spring Boot microservices behind one API gateway. A CT classifier and a Gemini-backed transplant note sit next to the clinical workflow.

## Team

- Walid Ismail
- Aziz Ben Sghaier
- Anas Souissi
- Nour Matoussi

Esprit School of Engineering, Tunisia. PIDEV, 3rd year, 2025-2026.

## What is where

| Path | Role |
| --- | --- |
| `frontend/frontoffice` | Patient application, port 4200 |
| `frontend/Back office` | Staff application, port 4369 |
| `backend` | Java microservices, gateway, discovery, config server |
| `kidney-ai` | FastAPI service that scores a kidney CT image |
| `Kidney Project IA` | Training code and the saved Keras model |
| `k8s` | Kubernetes manifests, monitoring stack, and the local runbook |
| `.github/workflows` | GitHub Actions for CI and the Kubernetes deploy |
| `documentation/Architecture Logique.png` | Logical architecture diagram |
| `backend/Jenkinsfile` | Alternate Jenkins pipeline |

## Clinical platform

Keycloak issues the tokens. The gateway on port 8070 checks them and routes to:

- `user-service` — accounts
- `clinical` — consultations, triage, medical history, transplant candidacy
- `Hospitalization-service` — admissions, rooms, vital signs, nutrition
- `diagnostic-service` — orders and results
- `dialysis-service` — treatments, sessions, nurse schedule, alerts
- `pharmacy-service` — medications, stock, prescriptions
- `order-service` — pharmacy delivery orders
- `monitoring-service` — appointments and live alerts

MySQL holds one database per service. Eureka and the config server are the Spring Cloud pieces around them.

## Machine learning

Two models are wired into the product.

**Kidney CT classification.** `Kidney Project IA` trains a MobileNetV2 classifier on CT slices. It labels an image as Cyst, Normal, Stone, or Tumor. The saved file is `Kidney Project IA/kidney_model_improved/best_cnn_kidney.keras`. That file is not stored in Git. `kidney-ai` loads it and exposes `POST /predict`. The staff app calls it from the kidney-scan page through the gateway path `/kidney-ai/**`. The response includes the label, the confidence, and a short follow-up recommendation. This is decision support for a clinician, not a diagnosis.

**Transplant recommendation.** The clinical service can draft a transplant candidacy note with Gemini when `GEMINI_API_KEY` is set. The physician still owns the decision.

To train or re-evaluate the CT model, use `Kidney Project IA/README.md`. The CT dataset itself stays out of the repository (`Kidney Project IA/archive`).

## DevOps

Each Java service is built with the same `backend/Dockerfile`. The image build argument `SERVICE_PATH` selects the module. `backend/docker-compose.backend.yml` starts MySQL, Keycloak, the Java services, and the kidney API on one machine.

GitHub Actions:

- `backend-ci.yml` runs Maven tests and checks that every service image builds.
- `frontend-ci.yml` builds both Angular apps and can run a SonarQube gate when `SONAR_TOKEN` is set.
- `cd-k8s.yml` pushes images to GitHub Container Registry and rolls them out with kubectl. The cluster kubeconfig is the `KUBE_CONFIG_DATA` repository secret.

Kubernetes manifests live in `k8s/`. `k8s/README.md` is the local cluster guide. `k8s/RUNBOOK.md` is the stop and start checklist. `k8s/monitoring-stack.yaml` adds Prometheus, Alertmanager, and Grafana. Passwords are not committed: copy `k8s/nephrocare-secrets.example.yaml` to `k8s/nephrocare-secrets.yaml` and fill it in before `kubectl apply`.

`backend/Jenkinsfile` is a second pipeline that builds the same images and can deploy the namespace `nephrocare`. `Dockerfile.jenkins` is the Jenkins controller image used for that setup. Sprint notes are in `docs/SPRINT-DEVOPS-STATUS.md`.

## Run it locally

Requirements: Docker, JDK 17, Node.js 20.

1. Copy `backend/.env.backend.example` to `backend/.env` and replace every `CHANGE_ME`. Use letters and numbers only.
2. From `backend/`:

```bash
docker compose -f docker-compose.backend.yml --env-file .env up --build
```

3. Patient app, from `frontend/frontoffice`:

```bash
npm ci
npm start
```

4. Staff app, from `frontend/Back office`:

```bash
npm ci
npm start
```

| Surface | URL |
| --- | --- |
| Patient app | http://localhost:4200 |
| Staff app | http://localhost:4369 |
| API gateway | http://localhost:8070 |
| Keycloak | http://localhost:8180 |

Demo account names are created from the passwords in `backend/.env` (`admin.user`, `doctor.user`, `nurse.user`, `patient.user`, `pharmacist.user`, `labtech.user`, `driver.user`).

For a Kubernetes deploy instead of Compose, follow `k8s/README.md`.
