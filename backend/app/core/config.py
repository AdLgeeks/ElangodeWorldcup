import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Elangode World Cup Prediction Platform"
    API_V1_STR: str = "/api"
    
    # Database Settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./elangode.db")
    
    # JWT Settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-key-change-in-production-1234567890")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Admin Seed Info
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@elangode.com")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "Admin123!")
    ADMIN_FULL_NAME: str = os.getenv("ADMIN_FULL_NAME", "Admin User")

    model_config = ConfigDict(case_sensitive=True)

settings = Settings()
