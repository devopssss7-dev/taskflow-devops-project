# TaskFlow – Task Management Application

A small, professional task-management application intended for an end-to-end DevOps project.

## Components
- Frontend: React + Vite
- Backend: FastAPI
- Database: PostgreSQL

## Features
- Dashboard with task statistics
- Create tasks
- Update task status
- Delete tasks
- Filter tasks by status
- Health endpoint for DevOps/Kubernetes probes

## Run locally

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend expects the API at `http://localhost:8000`.
