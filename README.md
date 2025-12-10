# BrainSAIT DRG Suite �� Saudi DRG Automation
[![[cloudflarebutton]]](https://deploy.workers.cloudflare.com/?url=${repositoryUrl})
BrainSAIT DRG Suite is an enterprise-grade healthcare automation platform tailored for the Saudi Arabian market. It ingests unstructured clinical notes, leverages AI-driven logic to assign ICD-10 and DRG codes (APR-DRGs for inpatient and EAPGs for outpatient), and automates claims submission to the national nphies platform. Built with SOC 2+ compliance in mind, the system supports configurable workflows across three automation phases: Computer-Assisted Coding (CAC), Semi-Autonomous, and Autonomous. The architecture separates a secure Python FastAPI backend (hosted on AWS) from a visually stunning React frontend deployed at the edge via Cloudflare Workers for global performance and intuitive user experience.
## Key Features
- **Clinical Note Ingestion & AI Coding**: Process unstructured text to generate ICD/DRG code suggestions with confidence scores and phase-based automation (CAC → Semi-Autonomous → Autonomous).
- **nphies Integration**: Secure OAuth-based API connectivity for claims submission, pre-authorization, status checks, and payment reconciliation, enforcing TLS 1.2 and JSON schema validation.
- **CDI Nudges**: Proactive prompts for clinicians to enhance documentation specificity, reducing retrospective queries via FastAPI endpoints.
- **Workflow Management**: Handle patient encounters, providers, claims, and coding jobs with PostgreSQL schema supporting Saudi-specific identifiers (National ID, Iqama ID, CR Number).
- **Audit & Reconciliation**: Comprehensive logging, status history, and payment matching for SOC 2 compliance.
- **Responsive UI**: Modern dashboard, coding workspace, claims manager, and integration console with shadcn/ui components, micro-interactions, and mobile-first design.
- **Mock & Real Integrations**: Includes mock CodingEngine for development; ready for production AI models and AWS services (RDS, ECS, Secrets Manager).
## Demo Flow Walkthrough
1.  **Login**: Access the application using one of the mock credentials:
    *   **Admin User**: `username: admin`, `password: password` (access to all modules).
    *   **Coder User**: `username: coder`, `password: password` (access to core coding modules).
2.  **Ingest a Note**: From the Home page or Dashboard, click "Ingest Note". Paste a clinical note (see `shared/mock-data.ts` for examples) and click "Analyze".
3.  **Coding Workspace**: You will be redirected to the workspace. The left panel shows the note, and the right panel displays AI-suggested codes with confidence scores.
4.  **Claims Manager**: Navigate to the Claims Manager to see a list of all claims. You can filter them by status.
5.  **Admin Modules**: If logged in as an admin, explore the **Integration Console** and **Audit & Reconciliation** pages to see mock monitoring and financial tools.
## Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, React Router, Zustand, React Query, Framer Motion.
- **Backend (Edge)**: Hono on Cloudflare Workers, Durable Objects for stateful storage.
- **Backend (Core Services)**: Python FastAPI (designed for AWS ECS/EKS), PostgreSQL (AWS RDS), SQLAlchemy.
- **DevOps & Tools**: Bun, Cloudflare Wrangler, Pytest, Docker, Zod, Pantic.
## Deployment
### Frontend & Edge Backend (Cloudflare)
1.  **Prerequisites**: A Cloudflare account and Wrangler CLI installed (`npm install -g wrangler`).
2.  **Login**: Authenticate with your Cloudflare account: `wrangler login`.
3.  **Build**: Build the project assets and worker script:
    ```bash
    bun install
    bun build
    ```
4.  **Deploy**: Publish the application to your Cloudflare account:
    ```bash
    wrangler deploy
    ```
    Wrangler will output the URL of your deployed application.
### Core Backend (AWS with Docker)
The Python services (`cdi_api.py`, `coding_engine.py`, `nphies_connector.py`) are designed to run on AWS. A `docker-compose.yml` would be used for a complete local setup.
1.  **Prerequisites**: Docker, AWS CLI.
2.  **Build Docker Image**:
    ```bash
    docker build -f docker/dev.Dockerfile -t brainsait-backend .
    ```
3.  **Run Locally (with mock services)**:
    ```bash
    docker run -p 8000:8000 -e NPHIES_CLIENT_ID="mock" -e NPHIES_CLIENT_SECRET="mock" brainsait-backend
    ```
4.  **Deploy to AWS**:
    *   Push the Docker image to Amazon ECR.
    *   Deploy the image as a service on Amazon ECS or Fargate.
    *   Use AWS Secrets Manager to store `NPHIES_CLIENT_ID` and `NPHIES_CLIENT_SECRET`.
    *   Connect the service to an AWS RDS PostgreSQL instance running the schema from `sql/schema.sql`.
    *   Configure an Application Load Balancer (ALB) to handle traffic and enforce TLS 1.2.
## Troubleshooting
- **Authentication Issues**: If login fails, check the mock credentials in `src/hooks/use-auth.ts`. Auth state is persisted in localStorage; clear it if issues persist.
- **Data Not Loading**: The application uses a mock backend on Cloudflare Workers seeded from `shared/mock-data.ts`. If data is missing, the seeding process may have failed. The first visit to any data-driven page triggers the seed.
- **Offline Errors**: The API client detects offline status. If you see "You are offline," check your internet connection.
## SOC2 Compliance Notes
This application is built with SOC2 readiness in mind:
- **Audit Trails**: All significant actions (claim submissions, user logins, data changes) are logged in the `audit_logs` table and viewable in the Audit & Reconciliation module.
- **Secure Configuration**: The `NphiesConnector` is designed to pull credentials from a secure source like AWS Secrets Manager, not from environment variables in production.
- **Data Encryption**: All data should be encrypted at rest (handled by AWS RDS) and in transit (enforced by ALB and Cloudflare).
- **Access Control**: Role-based access control is implemented via the `useAuth` hook and `ProtectedRoute` component, restricting admin modules to authorized users.
## API Reference
The frontend interacts with a mock API backend running on Cloudflare Workers. Key endpoints include:
- `GET /api/claims`: Fetches a paginated list of claims.
- `GET /api/coding-jobs`: Fetches recent coding jobs.
- `POST /api/ingest-note`: Submits a clinical note for analysis.
  - **Body**: `{ "clinical_note": "..." }`
  - **Returns**: A `CodingJob` object.
- `POST /api/coding-jobs/:id/accept`: Marks a coding job's suggestions as accepted.
- `GET /api/nudges`: Fetches a list of CDI nudges.
- `GET /api/audit-logs`: Fetches system audit logs (admin only).
- `GET /api/payments`: Fetches payment reconciliation data (admin only).
- `POST /api/reconcile-batch`: Triggers a mock batch reconciliation job (admin only).
[![[cloudflarebutton]]](https://deploy.workers.cloudflare.com/?url=${repositoryUrl})