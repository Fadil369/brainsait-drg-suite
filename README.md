# Solventum DRG Suite — Saudi DRG Automation

[![[cloudflarebutton]]](https://deploy.workers.cloudflare.com/?url=${repositoryUrl})

Solventum DRG Suite is an enterprise-grade healthcare automation platform tailored for the Saudi Arabian market. It ingests unstructured clinical notes, leverages AI-driven logic to assign ICD-10 and DRG codes (APR-DRGs for inpatient and EAPGs for outpatient), and automates claims submission to the national nphies platform. Built with SOC 2+ compliance in mind, the system supports configurable workflows across three automation phases: Computer-Assisted Coding (CAC), Semi-Autonomous, and Autonomous. The architecture separates a secure Python FastAPI backend (hosted on AWS) from a visually stunning React frontend deployed at the edge via Cloudflare Workers for global performance and intuitive user experience.

## Key Features

- **Clinical Note Ingestion & AI Coding**: Process unstructured text to generate ICD/DRG code suggestions with confidence scores and phase-based automation (CAC → Semi-Autonomous → Autonomous).
- **nphies Integration**: Secure OAuth-based API connectivity for claims submission, pre-authorization, status checks, and payment reconciliation, enforcing TLS 1.2 and JSON schema validation.
- **CDI Nudges**: Proactive prompts for clinicians to enhance documentation specificity, reducing retrospective queries via FastAPI endpoints.
- **Workflow Management**: Handle patient encounters, providers, claims, and coding jobs with PostgreSQL schema supporting Saudi-specific identifiers (National ID, Iqama ID, CR Number).
- **Audit & Reconciliation**: Comprehensive logging, status history, and payment matching for SOC 2 compliance.
- **Responsive UI**: Modern dashboard, coding workspace, claims manager, and integration console with shadcn/ui components, micro-interactions, and mobile-first design.
- **Mock & Real Integrations**: Includes mock CodingEngine for development; ready for production AI models and AWS services (RDS, ECS, Secrets Manager).

## Technology Stack

### Frontend
- **React 18** with **TypeScript** for robust UI development.
- **Tailwind CSS** and **shadcn/ui** for accessible, customizable components.
- **React Router** for navigation, **Zustand** for state management, **React Query** for data fetching.
- **Framer Motion** for smooth animations, **Lucide React** for icons, **Sonner** for notifications.

### Backend
- **Hono** on **Cloudflare Workers** for edge API routing and Durable Objects for stateful storage.
- **Python FastAPI** (via AWS ECS/EKS) for core services like NphiesConnector, CodingEngine, and CDI endpoints.
- **PostgreSQL** (AWS RDS) with SQLAlchemy for data modeling; Alembic for migrations.
- **Requests** library for nphies API interactions with OAuth and error handling.

### DevOps & Tools
- **Cloudflare Workers** for frontend deployment and edge computing.
- **AWS** (RDS, ECS/Fargate, Secrets Manager, S3) for backend infrastructure.
- **Bun** as the JavaScript runtime and package manager.
- **Pytest** for unit testing; **Wrangler** for Cloudflare deployment.
- **Docker** for local development; **Zod** and **Pydantic** for schema validation.

## Quick Start

### Prerequisites
- Node.js (v18+) and Bun installed.
- Python 3.10+ for backend services.
- AWS account for production backend (optional for local dev).
- Cloudflare account for deployment.

### Installation
1. Clone the repository:
   ```
   git clone <your-repo-url>
   cd solventum-drg-suite
   ```

2. Install dependencies with Bun:
   ```
   bun install
   ```

3. For backend setup (Python services):
   - Install Python dependencies: `pip install fastapi uvicorn pydantic sqlalchemy alembic psycopg2-binary requests pytest`.
   - Set up PostgreSQL (local or AWS RDS) and run migrations:
     ```
     alembic upgrade head
     ```
   - Configure environment variables (e.g., `DATABASE_URL`, `NPHIES_CLIENT_ID`) in a `.env` file using `python-dotenv`.

4. Seed initial data (optional, for demo):
   - Run the backend seed script or use the provided SQL schema to populate patients, providers, etc.

### Local Development
- Start the frontend dev server:
  ```
  bun dev
  ```
  The app will be available at `http://localhost:3000`.

- For backend services (FastAPI):
  ```
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
  ```
  Update API endpoints in `src/lib/api-client.ts` to point to your local backend if not using Cloudflare Workers.

- Test nphies integration (sandbox mode):
  - Set `NPHIES_BASE_URL` to the sandbox endpoint.
  - Run unit tests: `pytest tests/ -v`.

### Usage Examples

#### Frontend Usage
- **Dashboard**: View recent claims, pending coding jobs, and quick actions like note ingestion.
- **Coding Workspace**: Upload/paste clinical notes; review AI-suggested codes and submit claims.
- **Claims Manager**: Filter and manage claim statuses; view nphies responses.
- Example API call from React (using `api` helper):
  ```tsx
  import { api } from '@/lib/api-client';
  
  const submitNote = async (note: string) => {
    return api('/api/ingest-note', {
      method: 'POST',
      body: JSON.stringify({ clinical_note: note })
    });
  };
  ```

#### Backend Usage (Python)
- **NphiesConnector Example**:
  ```python
  from nphies_connector import NphiesConnector
  
  connector = NphiesConnector(
      base_url="https://sandbox.nphies.sa",
      client_id="your-client-id",
      client_secret="your-client-secret"
  )
  response = connector.submit_claim(claim_data)
  print(response)
  ```

- **CodingEngine Example**:
  ```python
  from coding_engine import CodingEngine
  
  engine = CodingEngine()
  job = engine.process_note("Patient presented with pneumonia symptoms...", encounter_type="INPATIENT")
  print(job.suggested_codes)
  ```

## Development Instructions

- **Code Style**: Use TypeScript for frontend; follow ESLint rules. Python code uses type hints with Pydantic.
- **State Management**: Leverage Zustand with primitive selectors only (no object destructuring in `useStore` to avoid re-renders).
- **Testing**: 
  - Frontend: Use Vitest or React Testing Library.
  - Backend: `pytest` for unit tests (e.g., NphiesConnector mocks with `requests-mock`).
- **Adding Routes**: Extend `worker/user-routes.ts` using Hono and entity patterns from `worker/entities.ts`.
- **UI Components**: Import shadcn/ui components (e.g., `Button` from `@/components/ui/button`). Ensure responsive design with Tailwind breakpoints.
- **Database Migrations**: Use Alembic for schema changes based on the provided PostgreSQL blueprint.
- **Linting & Formatting**:
  ```
  bun lint
  ```

## Deployment

Deploy to Cloudflare Workers for the frontend and edge APIs:

1. Build the project:
   ```
   bun build
   ```

2. Deploy with Wrangler:
   ```
   bun deploy
   ```
   This publishes to your Cloudflare account. Ensure `wrangler.jsonc` is configured with your account ID.

3. For backend (AWS):
   - Containerize FastAPI services with Docker.
   - Deploy to ECS/Fargate; use Secrets Manager for nphies credentials.
   - Set up ALB for TLS 1.2 enforcement.

4. Production Considerations:
   - Enable Cloudflare's SOC 2 compliance features (e.g., audit logs).
   - Configure CORS in Hono for backend-frontend communication.
   - Use environment variables for secrets; never commit them.

[![[cloudflarebutton]]](https://deploy.workers.cloudflare.com/?url=${repositoryUrl})

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Follow the code of conduct and ensure tests pass.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, file a GitHub issue. For production support, contact the development team. This project adheres to healthcare compliance standards (SOC 2+).