from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import auth, boards, nodes, search, workspaces, projects, invites, websockets, notifications, friends, chat
from app.websockets import board_ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    await init_db()
    yield


app = FastAPI(
    title="TaskPath API",
    description="Organik büyüyen görev haritası — Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routes
app.include_router(auth.router)
app.include_router(workspaces.router)
app.include_router(projects.router)
app.include_router(invites.router)
app.include_router(boards.router)
app.include_router(nodes.router)
app.include_router(search.router)
app.include_router(notifications.router)
app.include_router(friends.router)
app.include_router(chat.router)

# WebSocket routes
app.include_router(board_ws.router)
app.include_router(websockets.router)


@app.get("/")
async def root():
    return {"app": "TaskPath", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
