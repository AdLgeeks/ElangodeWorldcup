import datetime
import calendar
from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import User, Prediction, PredictionQuestion, Result
from app.schemas.schemas import UserResponse, UserStatusUpdate, UserProfileUpdate, AdminStatsResponse, AnalyticsChartPoint
from app.routers.deps import get_current_user, get_current_admin
from app.core.security import get_password_hash
from app.services.audit_service import log_audit_action

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=List[UserResponse])
def read_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Retrieves all users (Admin only)."""
    return db.query(User).order_by(User.created_at.desc()).all()

@router.put("/profile", response_model=UserResponse)
def update_profile(
    profile_in: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Updates user's own profile (full name, password)."""
    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name
    if profile_in.password is not None:
        if len(profile_in.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long."
            )
        current_user.password_hash = get_password_hash(profile_in.password)
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/{id}/status", response_model=UserResponse)
def update_user_status(
    id: int,
    status_in: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Enables or disables a user account (Admin only)."""
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot disable your own admin account."
        )
        
    if status_in.status not in ["active", "disabled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be either 'active' or 'disabled'."
        )
        
    user.status = status_in.status
    db.commit()
    db.refresh(user)
    
    log_audit_action(db, current_admin.id, f"Set status of user {user.email} to {status_in.status}")
    return user

@router.get("/analytics", response_model=AdminStatsResponse)
def get_admin_analytics(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Calculates statistics and chart datasets for the admin dashboard (Admin only)."""
    total_users = db.query(User).filter(User.role == "user").count()
    active_users = db.query(User).filter(User.role == "user", User.status == "active").count()
    active_questions = db.query(PredictionQuestion).filter(PredictionQuestion.status == "active").count()
    locked_questions = db.query(PredictionQuestion).filter(PredictionQuestion.status == "locked").count()
    total_predictions = db.query(Prediction).count()
    total_winners = db.query(Result).filter(Result.published_at.isnot(None), Result.winner_user_id.isnot(None)).count()
    
    # Participation Rate (percentage of users who have placed predictions)
    users_who_predicted = db.query(func.count(func.distinct(Prediction.user_id))).scalar() or 0
    participation_rate = round((users_who_predicted / total_users * 100), 1) if total_users > 0 else 0.0
    
    # Prediction Accuracy (percentage of correct predictions out of total predictions for completed/published questions)
    correct_predictions = db.query(Prediction).join(
        Result, Prediction.question_id == Result.question_id
    ).filter(
        Prediction.selected_option == Result.correct_answer,
        Result.published_at.isnot(None)
    ).count()
    
    total_completed_predictions = db.query(Prediction).join(
        Result, Prediction.question_id == Result.question_id
    ).filter(
        Result.published_at.isnot(None)
    ).count()
    
    prediction_accuracy = round((correct_predictions / total_completed_predictions * 100), 1) if total_completed_predictions > 0 else 0.0
    
    # Generate database-independent charts
    today = datetime.date.today()
    
    # 1. Daily Participation (last 7 days predictions count)
    daily_participation = []
    for i in range(6, -1, -1):
        day = today - datetime.timedelta(days=i)
        day_str = day.strftime("%b %d")
        start_dt = datetime.datetime.combine(day, datetime.time.min)
        end_dt = datetime.datetime.combine(day, datetime.time.max)
        
        count = db.query(Prediction).filter(
            Prediction.submitted_at >= start_dt,
            Prediction.submitted_at <= end_dt
        ).count()
        daily_participation.append(AnalyticsChartPoint(label=day_str, value=float(count)))
        
    # 2. User Growth (last 7 days cumulative user registration)
    user_growth = []
    six_days_ago = today - datetime.timedelta(days=6)
    start_of_six_days_ago = datetime.datetime.combine(six_days_ago, datetime.time.min)
    
    # Starting registration base
    running_total = db.query(User).filter(
        User.role == "user",
        User.created_at < start_of_six_days_ago
    ).count()
    
    for i in range(6, -1, -1):
        day = today - datetime.timedelta(days=i)
        day_str = day.strftime("%b %d")
        start_dt = datetime.datetime.combine(day, datetime.time.min)
        end_dt = datetime.datetime.combine(day, datetime.time.max)
        
        count_registered_today = db.query(User).filter(
            User.role == "user",
            User.created_at >= start_dt,
            User.created_at <= end_dt
        ).count()
        running_total += count_registered_today
        user_growth.append(AnalyticsChartPoint(label=day_str, value=float(running_total)))
        
    # 3. Prediction Distribution (predictions per match)
    predictions_by_match = db.query(
        PredictionQuestion.match_name,
        func.count(Prediction.id)
    ).join(
        Prediction, PredictionQuestion.id == Prediction.question_id
    ).group_by(
        PredictionQuestion.match_name
    ).limit(5).all()
    
    prediction_distribution = [
        AnalyticsChartPoint(label=match, value=float(count))
        for match, count in predictions_by_match
    ]
    if not prediction_distribution:
        prediction_distribution = [AnalyticsChartPoint(label="No Matches", value=0.0)]
        
    # 4. Monthly Activity (last 6 months predictions)
    monthly_activity = []
    current_year = today.year
    current_month = today.month
    for i in range(5, -1, -1):
        m = current_month - i
        y = current_year
        if m <= 0:
            m += 12
            y -= 1
        month_name = calendar.month_abbr[m]
        
        start_dt = datetime.datetime(y, m, 1)
        if m == 12:
            end_dt = datetime.datetime(y + 1, 1, 1)
        else:
            end_dt = datetime.datetime(y, m + 1, 1)
            
        count = db.query(Prediction).filter(
            Prediction.submitted_at >= start_dt,
            Prediction.submitted_at < end_dt
        ).count()
        monthly_activity.append(AnalyticsChartPoint(label=f"{month_name} {y}", value=float(count)))
        
    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        active_questions=active_questions,
        locked_questions=locked_questions,
        total_predictions=total_predictions,
        total_winners=total_winners,
        participation_rate=participation_rate,
        prediction_accuracy=prediction_accuracy,
        charts={
            "dailyParticipation": daily_participation,
            "userGrowth": user_growth,
            "predictionDistribution": prediction_distribution,
            "monthlyActivity": monthly_activity
        }
    )
