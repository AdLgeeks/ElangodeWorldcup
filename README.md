# Elangode World Cup Prediction Platform

A production-ready, full-stack match prediction and raffle platform built for fans of the World Cup. Admins post daily football prediction questions, and users submit guesses. After match completion, admins finalize predictions and trigger a secure random raffle to select a winner.

## Architecture & Tech Stack

- **Backend**: FastAPI (Python), SQLAlchemy (ORM), Alembic, SQLite (Local Dev) / PostgreSQL (Docker/Production).
- **Frontend**: React (TypeScript), Tailwind CSS, Vite, React Router, TanStack React Query.
- **Orchestration**: Nginx, Docker, Docker Compose.

---

## Directory Structure

```text
├── backend/
│   ├── app/
│   │   ├── core/         # DB config, Auth, Security
│   │   ├── models/       # SQLAlchemy Models
│   │   ├── routers/      # API Routers
│   │   ├── schemas/      # Pydantic Schemas
│   │   ├── services/     # Business Logic (Winner raffle, Leaderboard)
│   │   └── main.py       # FastAPI Entrypoint
│   ├── tests/            # Test suite
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # Shared UI components
│   │   ├── context/      # Authentication context
│   │   ├── pages/        # Dashboard, Leaderboards, Admin
│   │   ├── services/     # API Fetch client wrapper
│   │   └── types/        # TS Interface definitions
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## Setup & Running Locally

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### 1. Run the Backend APIs
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The API will be available at `http://127.0.0.1:8000`. Swagger documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Run the Frontend Client
1. Navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite server:
   ```bash
   npm run dev
   ```
   Access the app at `http://localhost:5173`.

---

## Production Deployment with Docker Compose

To deploy the entire environment (PostgreSQL db, FastAPI backend, and Nginx reverse proxy + React frontend) in one command:

1. Run Docker Compose:
   ```bash
   docker-compose up --build
   ```
2. The platform will be fully online and served at:
   - **Frontend UI & API Proxy**: `http://localhost` (Port 80)
   - **Backend API Direct Swagger**: `http://localhost:8000/docs`
   - **PostgreSQL Database Port**: `5432`

---

## Seeding & Default Credentials

Upon first startup, the database automatically seeds an initial Administrator account:

- **Admin Login URL**: `/admin/login`
- **Email**: `admin@elangode.com`
- **Password**: `Admin123!`

Standard users can sign up using the **Register** button on the public `/login` screen.
