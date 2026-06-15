import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.models.models import User
from app.core.security import get_password_hash

from app.routers import auth, questions, predictions, results, leaderboard, users, notifications

# Initialize DB tables
Base.metadata.create_all(bind=engine)

# Seed default Admin User if not exists
db = SessionLocal()
try:
    admin_exists = db.query(User).filter(User.role == "admin").first()
    if not admin_exists:
        hashed_password = get_password_hash(settings.ADMIN_PASSWORD)
        admin = User(
            email=settings.ADMIN_EMAIL,
            full_name=settings.ADMIN_FULL_NAME,
            password_hash=hashed_password,
            role="admin",
            status="active"
        )
        db.add(admin)
        db.commit()
finally:
    db.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(questions.router, prefix=settings.API_V1_STR)
app.include_router(predictions.router, prefix=settings.API_V1_STR)
app.include_router(results.router, prefix=settings.API_V1_STR)
app.include_router(leaderboard.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "version": "1.0.0"
    }
