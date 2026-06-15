import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.models import User, PredictionQuestion, Prediction, Result
from app.core.security import get_password_hash

# Use an in-memory/file SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Shared token stores for tests
tokens = {}

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()
    
    # Seed Admin User for tests
    hashed_pwd = get_password_hash(settings.ADMIN_PASSWORD)
    admin = User(
        email=settings.ADMIN_EMAIL,
        full_name=settings.ADMIN_FULL_NAME,
        password_hash=hashed_pwd,
        role="admin",
        status="active"
    )
    db_session.add(admin)
    db_session.commit()
    
    try:
        yield db_session
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    del app.dependency_overrides[get_db]

def test_register_and_login(client):
    # Register user 1
    res = client.post(
        "/api/auth/register",
        json={
            "email": "user1@example.com",
            "password": "Password123!",
            "full_name": "Test User One"
        }
    )
    assert res.status_code == 201
    assert res.json()["email"] == "user1@example.com"
    
    # Login user 1
    res = client.post(
        "/api/auth/login",
        json={
            "email": "user1@example.com",
            "password": "Password123!"
        }
    )
    assert res.status_code == 200
    assert "access_token" in res.json()
    tokens["user1"] = res.json()["access_token"]
    
    # Register user 2
    res = client.post(
        "/api/auth/register",
        json={
            "email": "user2@example.com",
            "password": "Password123!",
            "full_name": "Test User Two"
        }
    )
    assert res.status_code == 201
    
    # Login user 2
    res = client.post(
        "/api/auth/login",
        json={
            "email": "user2@example.com",
            "password": "Password123!"
        }
    )
    assert res.status_code == 200
    tokens["user2"] = res.json()["access_token"]

def test_admin_seed(client):
    # Login admin
    res = client.post(
        "/api/auth/login",
        json={
            "email": settings.ADMIN_EMAIL,
            "password": settings.ADMIN_PASSWORD
        }
    )
    assert res.status_code == 200
    assert "access_token" in res.json()
    tokens["admin"] = res.json()["access_token"]

def test_prediction_workflow(client):
    user_token = tokens["user1"]
    user2_token = tokens["user2"]
    admin_token = tokens["admin"]
    
    headers_user = {"Authorization": f"Bearer {user_token}"}
    headers_user2 = {"Authorization": f"Bearer {user2_token}"}
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Create a draft question (Admin)
    deadline = (datetime.datetime.utcnow() + datetime.timedelta(hours=2)).isoformat()
    res = client.post(
        "/api/questions/",
        json={
            "title": "Who will win Argentina vs Croatia?",
            "description": "Semi-final prediction",
            "match_name": "Argentina vs Croatia",
            "competition_name": "World Cup 2022",
            "options_json": ["Argentina", "Draw", "Croatia"],
            "deadline": deadline
        },
        headers=headers_admin
    )
    assert res.status_code == 201
    q_id = res.json()["id"]
    
    # User shouldn't see draft questions
    res = client.get("/api/questions/", headers=headers_user)
    assert q_id not in [q["id"] for q in res.json()]
    
    # 2. Make question active (Admin)
    res = client.put(
        f"/api/questions/{q_id}",
        json={"status": "active"},
        headers=headers_admin
    )
    assert res.status_code == 200
    assert res.json()["status"] == "active"
    
    # User can see active questions now
    res = client.get("/api/questions/", headers=headers_user)
    assert q_id in [q["id"] for q in res.json()]
    
    # 3. Submit predictions
    res = client.post(
        "/api/predictions/",
        json={"question_id": q_id, "selected_option": "Argentina"},
        headers=headers_user
    )
    assert res.status_code == 201
    
    # Try double prediction -> should fail
    res = client.post(
        "/api/predictions/",
        json={"question_id": q_id, "selected_option": "Croatia"},
        headers=headers_user
    )
    assert res.status_code == 400
    assert "already submitted" in res.json()["detail"]
    
    # Submit prediction for second user
    res = client.post(
        "/api/predictions/",
        json={"question_id": q_id, "selected_option": "Argentina"},
        headers=headers_user2
    )
    assert res.status_code == 201
    
    # 4. Lock question
    res = client.post(
        f"/api/questions/{q_id}/lock",
        headers=headers_admin
    )
    assert res.status_code == 200
    assert res.json()["status"] == "locked"
    
    # Submit prediction after lock -> should fail
    res = client.post(
        "/api/predictions/",
        json={"question_id": q_id, "selected_option": "Argentina"},
        headers=headers_user
    )
    assert res.status_code == 400
    
    # 5. Submit answer & generate winner preview
    res = client.post(
        f"/api/results/{q_id}/answer",
        json={"correct_answer": "Argentina"},
        headers=headers_admin
    )
    assert res.status_code == 200
    data = res.json()
    assert data["eligible_users_count"] == 2
    assert data["winner"] is not None
    assert data["winner"]["email"] in ["user1@example.com", "user2@example.com"]
    
    # Winner not public yet
    res = client.get("/api/results/", headers=headers_user)
    assert len(res.json()) == 0
    
    # 6. Approve result
    res = client.post(
        f"/api/results/{q_id}/approve",
        headers=headers_admin
    )
    assert res.status_code == 200
    assert res.json()["approved"] is True
    
    # 7. Publish winner
    res = client.post(
        f"/api/results/{q_id}/publish",
        headers=headers_admin
    )
    assert res.status_code == 200
    assert res.json()["published_at"] is not None
    
    # Public results show winner now
    res = client.get("/api/results/", headers=headers_user)
    assert len(res.json()) == 1
    assert res.json()[0]["winner_name"] in ["Test User One", "Test User Two"]
