# EAs-TradingAlgo-Dashboard Project Bootstrap Guide

This guide walks through creating the project structure step-by-step inside **PyCharm** under `C:\\Users\\anish\\PycharmProjects\\EAs-TradingAlgo-Dashboard`. Follow each section in order; you can stop after any completed step if you wish to inspect the result before moving on.

> **Tip:** In PyCharm you can open the terminal (`View → Tool Windows → Terminal`) to run the commands in each step.

---

## 1. Create the top-level folders

1. Open a terminal in the `C:\\Users\\anish\\PycharmProjects` directory.
2. Run the following commands from **Command Prompt (cmd.exe)** to scaffold the backend, frontend, and shared configuration areas:

   ```cmd
   mkdir EAs-TradingAlgo-Dashboard
   cd EAs-TradingAlgo-Dashboard
   mkdir backend
   mkdir frontend
   mkdir infra
   mkdir frontend\public
   mkdir frontend\src
   ```

   *Result:* You should now have an empty project folder with `backend/`, `frontend/`, and `infra/` directories ready for the next steps.

---

## 2. Initialize a Git repository

1. While inside the `EAs-TradingAlgo-Dashboard` directory, initialize Git and make the first commit:

   ```cmd
   git init
   git add .
   git commit -m "Initial project scaffolding"
   ```

2. (Optional) Set up the remote repository if you already created one on GitHub or another hosting service:

   ```cmd
   git remote add origin <REMOTE_URL>
   ```

---

## 3. Set up the backend (FastAPI + Poetry)

1. Ensure [Poetry](https://python-poetry.org/) is available on your machine. If Command Prompt reports `'poetry' is not recognized` run the following once (close and reopen the terminal afterward so the new PATH is picked up):

   ```cmd
   py -m pip install --user pipx
   py -m pipx ensurepath
   pipx install poetry
   poetry --version
   ```

   If you prefer not to install `pipx`, you can temporarily use `py -m pip install --user poetry`, but `pipx` is the recommended, officially supported method.

2. Inside the `backend` directory, create the Python project and lock dependencies with Poetry:

   ```cmd
   cd backend
   poetry init --name "eas_trading_algo_backend" --dependency fastapi --dependency uvicorn --dependency python-dotenv --dependency sqlalchemy --dependency asyncpg --dependency pydantic --dependency apscheduler -n
   ```

3. Create the application package structure:

   ```cmd
   mkdir src
   mkdir src\app
   mkdir src\app\api
   mkdir src\app\core
   mkdir src\app\models
   mkdir src\app\services
   type nul > src\app\__init__.py
   type nul > src\app\main.py
   type nul > src\app\api\__init__.py
   type nul > src\app\api\routes.py
   type nul > src\app\core\__init__.py
   type nul > src\app\core\config.py
   type nul > src\app\models\__init__.py
   type nul > src\app\services\__init__.py
   type nul > src\app\services\mt5_client.py
   ```

4. Add the FastAPI entry point `src/app/main.py` with a basic health endpoint and router wiring:

   ```python
   from fastapi import FastAPI
   from fastapi.middleware.cors import CORSMiddleware

   from app.api.routes import api_router
   from app.core.config import settings

   app = FastAPI(title="EAs Trading Algo Dashboard API")

   app.add_middleware(
       CORSMiddleware,
       allow_origins=settings.cors_origins,
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )

   @app.get("/health", tags=["system"])
   async def health() -> dict[str, bool]:
       return {"ok": True}

   app.include_router(api_router, prefix=settings.api_prefix)
   ```

5. Configure application settings in `src/app/core/config.py`:

   ```python
   from pydantic import BaseSettings, AnyHttpUrl
   from typing import List


   class Settings(BaseSettings):
       api_prefix: str = "/api"
       cors_origins: List[AnyHttpUrl] = ["http://localhost:5173"]
       database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/eas_dashboard"

       class Config:
           env_file = ".env"


   settings = Settings()
   ```

6. Create a placeholder API router in `src/app/api/routes.py`:

   ```python
   from fastapi import APIRouter

   api_router = APIRouter()
   ```

7. Add an `.env.example` file in the backend root for environment variables. You can create it from Command Prompt with:

   ```cmd
   echo DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/eas_dashboard> .env.example
   echo CORS_ORIGINS=http://localhost:5173>> .env.example
   ```

8. Update `pyproject.toml` to configure Poetry for an application package by adding under `[tool.poetry]`:

   ```toml
   packages = [{ include = "app", from = "src" }]
   ```

9. Create a `README.md` inside `backend/` describing how to run the API with Poetry. You can create the empty file from Command Prompt and then edit it in PyCharm:

   ```cmd
   type nul > README.md
   ```

   Add the following content:

   ````markdown
   # Backend

   ## Run locally

   ```cmd
   poetry install
   poetry run uvicorn app.main:app --reload
   ```
   ````

---

## 4. Scaffold the frontend (React + Vite + TypeScript)

1. From the project root, bootstrap a new Vite app:

   ```cmd
   cd ..
   rem Ensure you are back at the project root
   npm create vite@latest frontend -- --template react-ts
   cd frontend
   npm install
   ```

2. Replace `src/App.tsx` with an initial layout containing three tabs for **All**, **Group A**, and **Group B** and a placeholder summary grid:

   ```tsx
   import { useState } from "react";

   type TabKey = "all" | "groupA" | "groupB";

   const tabs: { key: TabKey; label: string }[] = [
     { key: "all", label: "All Algos" },
     { key: "groupA", label: "Group A" },
     { key: "groupB", label: "Group B" },
   ];

   export function App() {
     const [activeTab, setActiveTab] = useState<TabKey>("all");

     return (
       <div className="min-h-screen bg-slate-950 text-slate-100">
         <header className="border-b border-slate-800 p-6">
           <h1 className="text-2xl font-semibold">EAs Trading Algo Dashboard</h1>
         </header>
         <main className="mx-auto max-w-5xl p-6">
           <nav className="flex gap-4">
             {tabs.map((tab) => (
               <button
                 key={tab.key}
                 onClick={() => setActiveTab(tab.key)}
                 className={`rounded px-4 py-2 text-sm font-medium transition ${
                   activeTab === tab.key
                     ? "bg-emerald-500 text-slate-950"
                     : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                 }`}
               >
                 {tab.label}
               </button>
             ))}
           </nav>

           <section className="mt-8 grid gap-4 md:grid-cols-2">
             {[1, 2, 3].map((id) => (
               <article key={id} className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow">
                 <h2 className="text-lg font-semibold">Algorithm {id}</h2>
                 <p className="text-sm text-slate-400">Account #000{id}</p>
                 <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                   <div>
                     <dt className="text-slate-400">Balance</dt>
                     <dd className="font-medium">$25,000</dd>
                   </div>
                   <div>
                     <dt className="text-slate-400">P/L %</dt>
                     <dd className="font-medium text-emerald-400">+4.5%</dd>
                   </div>
                   <div>
                     <dt className="text-slate-400">Drawdown</dt>
                     <dd className="font-medium text-red-400">-1.2%</dd>
                   </div>
                   <div>
                     <dt className="text-slate-400">Last Update</dt>
                     <dd className="font-medium">2m ago</dd>
                   </div>
                 </dl>
               </article>
             ))}
           </section>
         </main>
       </div>
     );
   }

   export default App;
   ```

3. Add Tailwind CSS for styling by following the [official guide](https://tailwindcss.com/docs/guides/vite) or using your preferred component library.

4. Create `src/api/client.ts` to centralize API calls to the FastAPI backend:

   ```ts
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

   export async function fetchAlgorithms(tab?: string) {
     const search = tab ? `?tab=${tab}` : "";
     const response = await fetch(`${API_BASE_URL}/algorithms${search}`);

     if (!response.ok) {
       throw new Error("Failed to load algorithms");
     }

     return response.json();
   }
   ```

5. Store environment-specific URLs in `frontend/.env.example` (create via Command Prompt):

   ```cmd
   echo VITE_API_BASE_URL=http://localhost:8000/api> .env.example
   ```

---

## 5. Infrastructure configuration

1. Inside the `infra/` directory create deployment manifests or Terraform/Helm charts as needed. To start, create a `README.md` that outlines platform targets (Heroku worker/API, Netlify frontend) and required environment variables.

2. Add a `docker-compose.yml` at the project root to coordinate local development services:

   ```yaml
   version: "3.9"

   services:
     api:
       build: ./backend
       command: poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000
       ports:
         - "8000:8000"
       env_file:
         - backend/.env
       depends_on:
         - db

     db:
       image: postgres:15
       restart: always
       environment:
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: postgres
         POSTGRES_DB: eas_dashboard
       ports:
         - "5432:5432"

     frontend:
       build: ./frontend
       command: npm run dev -- --host 0.0.0.0 --port 5173
       ports:
         - "5173:5173"
       environment:
         - VITE_API_BASE_URL=http://localhost:8000/api
       depends_on:
         - api
   ```

---

## 6. Commit early and often

1. After completing each section, run `git status` to see changes.
2. Use descriptive commit messages, for example:

   ```cmd
   git add backend/src/app/main.py backend/src/app/core/config.py
   git commit -m "Add FastAPI entry point and settings"
   ```

3. Push to your remote repository when you’re ready:

   ```cmd
   git push origin main
   ```

---

Following this guide will give you a fully scaffolded project ready for algorithm-tracking features, data ingestion loops, and deployment pipelines.
