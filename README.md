# NephroCare - Smart Nephrology Management Platform

## Overview

This project was developed as part of the **PIDEV - 3rd Year Engineering Program** at **Esprit School of Engineering** (Academic Year **2025-2026**).

NephroCare is a full-stack healthcare platform designed to support nephrology workflows, including clinical follow-up, hospitalization monitoring, diagnostics, dialysis tracking, and pharmacy management.

## Features

- Role-based authentication and access control (Keycloak)
- Clinical module (consultations, triage, medical history)
- Hospitalization module (vital signs, admissions, patient monitoring)
- Diagnostic module (orders and result tracking)
- Dialysis module (sessions and treatment lifecycle)
- Pharmacy module (medications and prescription workflow)
- Notifications and alerts for critical conditions
- Back Office dashboard for operational supervision

## Tech Stack

### Frontend

- Angular
- TypeScript
- Bootstrap / CSS
- RxJS

### Backend

- Java
- Spring Boot
- Spring Cloud (API Gateway, Eureka Discovery)
- MySQL
- Keycloak (IAM / SSO)

## Architecture

The system follows a **microservices architecture**:

- `Api-Gateway`
- `discovery-service`
- `user-service`
- `clinical-service`
- `Hospitalization-service`
- `diagnostic-service`
- `dialysis-service`
- `pharmacy-service`

Each service is independently deployable and communicates via REST APIs.

## Contributors

- [Your Name 1]
- [Your Name 2]
- [Your Name 3]
- [Your Name 4]

## Academic Context

Developed at **Esprit School of Engineering - Tunisia**  
**PIDEV - 3A | 2025-2026**

## Getting Started

1. Clone the repository:
  ```bash
   git clone <your-repo-url>
   cd <repo-folder>
  ```
2. Start infrastructure services:
  - Keycloak
  - MySQL
  - Eureka Discovery
3. Run backend microservices (Spring Boot).
4. Run frontend apps:
  - Front Office
  - Back Office
5. Access the platform from browser:
  - Front Office: `http://localhost:4200`
  - Back Office: `http://localhost:4369` (or your configured port)

## Acknowledgments

- **Esprit School of Engineering**
- Supervisors and teaching staff of the PIDEV program
- Open-source communities behind Angular, Spring, and Keycloak

