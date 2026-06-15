from datetime import datetime
from typing import List, Optional, Any, Dict, Union
from pydantic import BaseModel, EmailStr, Field

# --- AUTH SCHEMAS ---

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    type: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: Optional[str] = None

class UserRegister(BaseModel):
    email: str
    password: Optional[str] = None
    full_name: str

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None

class UserStatusUpdate(BaseModel):
    status: str  # "active" or "disabled"

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    status: str
    points: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- QUESTION SCHEMAS ---

class QuestionBase(BaseModel):
    title: str
    description: Optional[str] = None
    match_name: str
    competition_name: str
    options_json: Union[List[str], Dict[str, Any]]
    deadline: datetime

class QuestionCreate(QuestionBase):
    pass

class QuestionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    match_name: Optional[str] = None
    competition_name: Optional[str] = None
    options_json: Optional[Union[List[str], Dict[str, Any]]] = None
    deadline: Optional[datetime] = None
    status: Optional[str] = None  # "draft", "active", "locked", "completed", "published"

class QuestionResponse(QuestionBase):
    id: int
    status: str
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- PREDICTION SCHEMAS ---

class PredictionCreate(BaseModel):
    question_id: int
    selected_option: str

class PredictionResponse(BaseModel):
    id: int
    user_id: int
    question_id: int
    selected_option: str
    submitted_at: datetime
    question: Optional[QuestionResponse] = None

    class Config:
        from_attributes = True

# --- RESULT SCHEMAS ---

class ResultSubmitAnswer(BaseModel):
    correct_answer: str

class ResultResponse(BaseModel):
    id: int
    question_id: int
    correct_answer: str
    winner_user_id: Optional[int] = None
    winner_name: Optional[str] = None
    approved: bool
    approved_at: Optional[datetime] = None
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class WinnerPreviewResponse(BaseModel):
    question_id: int
    correct_answer: str
    eligible_users_count: int
    winner: Optional[UserResponse] = None

# --- LEADERBOARD SCHEMAS ---

class LeaderboardRowResponse(BaseModel):
    rank: int
    user_id: int
    full_name: str
    total_points: int
    correct_predictions: int
    total_predictions: int
    win_percentage: float

class LeaderboardResponse(BaseModel):
    timeframe: str  # "weekly", "monthly", "overall"
    rankings: List[LeaderboardRowResponse]

# --- NOTIFICATION SCHEMAS ---

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- STATISTICS SCHEMAS ---

class AnalyticsChartPoint(BaseModel):
    label: str
    value: float

class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    active_questions: int
    locked_questions: int
    total_predictions: int
    total_winners: int
    participation_rate: float  # percentage of users who have placed predictions
    prediction_accuracy: float  # overall correct / total predictions for completed questions
    charts: Dict[str, List[AnalyticsChartPoint]]
