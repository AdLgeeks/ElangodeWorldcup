import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="user", nullable=False)  # "admin", "user"
    status = Column(String, default="active", nullable=False)  # "active", "disabled"
    points = Column(Integer, default=0, nullable=False)
    mobile_number = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # Relationships
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="admin")
    won_results = relationship("Result", back_populates="winner_user")

class PredictionQuestion(Base):
    __tablename__ = "prediction_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    match_name = Column(String, nullable=False)
    competition_name = Column(String, nullable=False)
    options_json = Column(JSON, nullable=False)  # e.g., ["Argentina", "Draw", "Croatia"] or slider config
    deadline = Column(DateTime, nullable=False)
    status = Column(String, default="draft", nullable=False)  # "draft", "active", "locked", "completed", "published"
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # Relationships
    predictions = relationship("Prediction", back_populates="question", cascade="all, delete-orphan")
    result = relationship("Result", back_populates="question", uselist=False, cascade="all, delete-orphan")

class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("prediction_questions.id"), nullable=False, index=True)
    selected_option = Column(String, nullable=False)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="predictions")
    question = relationship("PredictionQuestion", back_populates="predictions")
    
    __table_args__ = (
        UniqueConstraint("user_id", "question_id", name="uq_user_question_prediction"),
    )

class Result(Base):
    __tablename__ = "results"
    
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("prediction_questions.id"), unique=True, nullable=False)
    correct_answer = Column(String, nullable=False)
    winner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved = Column(Boolean, default=False, nullable=False)
    approved_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    
    # Relationships
    question = relationship("PredictionQuestion", back_populates="result")
    winner_user = relationship("User", back_populates="won_results")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="notifications")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # Relationships
    admin = relationship("User", back_populates="audit_logs")
