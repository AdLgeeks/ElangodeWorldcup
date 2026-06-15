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

# Sanitize DATABASE_URL (convert postgres:// to postgresql:// and URL-encode the password if needed)
import urllib.parse

def sanitize_db_url(url: str) -> str:
    if not url or url.startswith("sqlite"):
        return url
    try:
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        
        split = urllib.parse.urlsplit(url)
        if split.password:
            unquoted_password = urllib.parse.unquote(split.password)
            quoted_password = urllib.parse.quote_plus(unquoted_password)
            
            username = split.username or ""
            quoted_username = urllib.parse.quote_plus(urllib.parse.unquote(username)) if username else ""
            
            netloc = f"{quoted_username}:{quoted_password}@{split.hostname}"
            if split.port:
                netloc += f":{split.port}"
            
            url = urllib.parse.urlunsplit((
                split.scheme,
                netloc,
                split.path,
                split.query,
                split.fragment
            ))
    except Exception:
        pass
    return url

settings.DATABASE_URL = sanitize_db_url(settings.DATABASE_URL)

