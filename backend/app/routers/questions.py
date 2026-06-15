import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import PredictionQuestion, User, Result
from app.schemas.schemas import QuestionCreate, QuestionUpdate, QuestionResponse
from app.routers.deps import get_current_user, get_current_admin
from app.services.prediction_service import check_and_lock_questions
from app.services.notification_service import create_global_notification
from app.services.audit_service import log_audit_action

router = APIRouter(prefix="/questions", tags=["questions"])

@router.get("/", response_model=List[QuestionResponse])
def read_questions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_and_lock_questions(db)
    if current_user.role == "admin":
        return db.query(PredictionQuestion).order_by(PredictionQuestion.created_at.desc()).all()
    else:
        # Hide "draft" status questions from standard users
        return db.query(PredictionQuestion).filter(
            PredictionQuestion.status != "draft"
        ).order_by(PredictionQuestion.created_at.desc()).all()

@router.get("/active", response_model=List[QuestionResponse])
def read_active_questions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_and_lock_questions(db)
    return db.query(PredictionQuestion).filter(
        PredictionQuestion.status == "active"
    ).order_by(PredictionQuestion.deadline.asc()).all()

@router.post("/", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    question_in: QuestionCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    # If the user sets status as active immediately, notify users
    status_val = "draft"
    
    question = PredictionQuestion(
        title=question_in.title,
        description=question_in.description,
        match_name=question_in.match_name,
        competition_name=question_in.competition_name,
        options_json=question_in.options_json,
        deadline=question_in.deadline,
        status=status_val,
        created_by=current_admin.id
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    
    log_audit_action(db, current_admin.id, f"Created Question ID {question.id} as Draft")
    return question

@router.put("/{id}", response_model=QuestionResponse)
def update_question(
    id: int,
    question_in: QuestionUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    check_and_lock_questions(db)
    question = db.query(PredictionQuestion).filter(PredictionQuestion.id == id).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
        
    # Validation: "Edit Questions before locking"
    if question.status in ["locked", "completed", "published"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit question in {question.status} status."
        )
        
    update_data = question_in.model_dump(exclude_unset=True)
    
    # Track transition from draft to active to alert users
    old_status = question.status
    new_status = update_data.get("status", old_status)
    
    for key, value in update_data.items():
        setattr(question, key, value)
        
    db.commit()
    db.refresh(question)
    
    log_audit_action(db, current_admin.id, f"Updated Question ID {question.id}")
    
    # Notify users if the question transitions to Active
    if old_status == "draft" and new_status == "active":
        create_global_notification(
            db,
            title="⚽ New Prediction Available!",
            message=f"A new prediction is open: '{question.title}' for {question.match_name}. Go place your vote!"
        )
        
    return question

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    question = db.query(PredictionQuestion).filter(PredictionQuestion.id == id).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
        
    db.delete(question)
    db.commit()
    log_audit_action(db, current_admin.id, f"Deleted Question ID {id}")
    return None

@router.post("/{id}/lock", response_model=QuestionResponse)
def lock_question(
    id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    question = db.query(PredictionQuestion).filter(PredictionQuestion.id == id).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
        
    if question.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot lock question in '{question.status}' status."
        )
        
    question.status = "locked"
    db.commit()
    db.refresh(question)
    
    log_audit_action(db, current_admin.id, f"Manually locked Question ID {question.id}")
    return question
