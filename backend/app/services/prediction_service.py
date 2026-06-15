import datetime
from sqlalchemy.orm import Session
from app.models.models import PredictionQuestion, Prediction, User
from fastapi import HTTPException, status

def check_and_lock_questions(db: Session):
    """Automatically locks active questions whose deadlines have passed."""
    now = datetime.datetime.utcnow()
    expired_questions = db.query(PredictionQuestion).filter(
        PredictionQuestion.status == "active",
        PredictionQuestion.deadline <= now
    ).all()
    for q in expired_questions:
        q.status = "locked"
    if expired_questions:
        db.commit()

def create_prediction(db: Session, user_id: int, question_id: int, selected_option: str) -> Prediction:
    # Check if the user exists and is active
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled or does not exist."
        )

    # First auto-lock expired questions to ensure fresh status
    check_and_lock_questions(db)
    
    question = db.query(PredictionQuestion).filter(PredictionQuestion.id == question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction question not found."
        )
        
    if question.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Predictions are closed. Question is currently {question.status}."
        )
        
    if datetime.datetime.utcnow() >= question.deadline:
        question.status = "locked"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Predictions are closed. The deadline has passed."
        )
        
    # Check if user has already predicted
    existing = db.query(Prediction).filter(
        Prediction.user_id == user_id,
        Prediction.question_id == question_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted a prediction for this question."
        )
        
    # Validate choice is one of the options
    options = question.options_json
    if isinstance(options, list):
        if selected_option not in options:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid option. Eligible options: {', '.join(options)}"
            )
    elif isinstance(options, dict):
        # Numeric slider type: check min/max if specified
        try:
            val = float(selected_option)
            min_val = float(options.get("min", 0))
            max_val = float(options.get("max", 100))
            if not (min_val <= val <= max_val):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Value must be between {min_val} and {max_val}."
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected option must be a valid number for this type."
            )
            
    prediction = Prediction(
        user_id=user_id,
        question_id=question_id,
        selected_option=selected_option,
        submitted_at=datetime.datetime.utcnow()
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction
