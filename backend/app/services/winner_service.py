import datetime
import secrets
from sqlalchemy.orm import Session
from app.models.models import PredictionQuestion, Prediction, User, Result
from app.services.notification_service import create_notification
from app.services.audit_service import log_audit_action
from fastapi import HTTPException, status

def generate_winner_preview(db: Session, question_id: int, correct_answer: str) -> Result:
    """
    Submits the correct answer, finds eligible users, randomly selects one, 
    and saves/updates a draft Result row.
    """
    question = db.query(PredictionQuestion).filter(PredictionQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
        
    if question.status not in ["active", "locked", "completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Cannot generate winner for question with status '{question.status}'"
        )
        
    # Auto-transition status to completed
    if question.status != "completed":
        question.status = "completed"
        db.commit()

    # Find correct predictions
    correct_predictions = db.query(Prediction).filter(
        Prediction.question_id == question_id,
        Prediction.selected_option == correct_answer
    ).all()

    eligible_user_ids = [p.user_id for p in correct_predictions]
    winner_id = None
    
    if eligible_user_ids:
        # Secure random selection
        winner_id = secrets.choice(eligible_user_ids)
        
    # Check if Result already exists
    result = db.query(Result).filter(Result.question_id == question_id).first()
    if result:
        # Update existing
        result.correct_answer = correct_answer
        result.winner_user_id = winner_id
        result.approved = False
        result.approved_at = None
        result.published_at = None
    else:
        # Create new
        result = Result(
            question_id=question_id,
            correct_answer=correct_answer,
            winner_user_id=winner_id,
            approved=False
        )
        db.add(result)
        
    db.commit()
    db.refresh(result)
    return result

def regenerate_winner(db: Session, question_id: int, admin_id: int) -> Result:
    """Rerolls the raffle winner from correct predictors."""
    result = db.query(Result).filter(Result.question_id == question_id).first()
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Result not initialized. Generate winner first."
        )
        
    if result.approved or result.published_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Cannot regenerate winner for an already approved/published result."
        )
        
    correct_predictions = db.query(Prediction).filter(
        Prediction.question_id == question_id,
        Prediction.selected_option == result.correct_answer
    ).all()
    
    eligible_user_ids = [p.user_id for p in correct_predictions]
    
    # Exclude current winner if there are other options to choose from
    if len(eligible_user_ids) > 1 and result.winner_user_id in eligible_user_ids:
        eligible_user_ids.remove(result.winner_user_id)
        
    if eligible_user_ids:
        result.winner_user_id = secrets.choice(eligible_user_ids)
    else:
        result.winner_user_id = None
        
    db.commit()
    db.refresh(result)
    log_audit_action(db, admin_id, f"Regenerated winner for Question ID {question_id}")
    return result

def approve_winner(db: Session, question_id: int, admin_id: int) -> Result:
    """Approves the generated winner."""
    result = db.query(Result).filter(Result.question_id == question_id).first()
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Result not found."
        )
        
    if result.approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Result already approved."
        )
        
    result.approved = True
    result.approved_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(result)
    log_audit_action(db, admin_id, f"Approved winner for Question ID {question_id}")
    return result

def publish_winner(db: Session, question_id: int, admin_id: int) -> Result:
    """Publishes result, awards points, updates question status, and alerts users."""
    result = db.query(Result).filter(Result.question_id == question_id).first()
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found.")
        
    if not result.approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Result must be approved by admin before publishing."
        )
        
    if result.published_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Result already published."
        )
        
    question = db.query(PredictionQuestion).filter(PredictionQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
        
    # Award points to all correct predictors
    correct_predictions = db.query(Prediction).filter(
        Prediction.question_id == question_id,
        Prediction.selected_option == result.correct_answer
    ).all()
    
    correct_user_ids = [p.user_id for p in correct_predictions]
    
    if correct_user_ids:
        # Bulk update: Increment points by 10
        db.query(User).filter(User.id.in_(correct_user_ids)).update(
            {User.points: User.points + 10}, synchronize_session=False
        )
        
    # Mark question status as published
    question.status = "published"
    result.published_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(result)
    db.refresh(question)
    
    # Send out In-App Notifications
    # 1. Notify the winner
    if result.winner_user_id:
        winner = db.query(User).filter(User.id == result.winner_user_id).first()
        create_notification(
            db, 
            user_id=result.winner_user_id, 
            title="🏆 You Won the Raffle!", 
            message=f"Congratulations! You've been chosen as the lucky winner for the prediction: '{question.title}'!"
        )
    
    # 2. Notify all correct predictors about the publication
    for user_id in correct_user_ids:
        create_notification(
            db,
            user_id=user_id,
            title="🎯 Prediction Correct!",
            message=f"Your prediction for '{question.title}' was correct! You earned 10 points."
        )
        
    # Log actions
    log_audit_action(db, admin_id, f"Published winner/result for Question ID {question_id}")
    
    return result
