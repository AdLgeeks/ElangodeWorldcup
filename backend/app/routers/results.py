from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Result, User, PredictionQuestion, Prediction
from app.schemas.schemas import ResultSubmitAnswer, ResultResponse, WinnerPreviewResponse, UserResponse
from app.routers.deps import get_current_user, get_current_admin
from app.services import winner_service

router = APIRouter(prefix="/results", tags=["results"])

@router.get("/", response_model=List[ResultResponse])
def get_published_results(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns all published results to all logged in users."""
    results = db.query(Result).join(
        PredictionQuestion, Result.question_id == PredictionQuestion.id
    ).filter(
        Result.published_at.isnot(None)
    ).order_by(Result.published_at.desc()).all()
    
    response = []
    for r in results:
        winner_name = None
        if r.winner_user_id:
            winner = db.query(User).filter(User.id == r.winner_user_id).first()
            if winner:
                winner_name = winner.full_name
                
        response.append(
            ResultResponse(
                id=r.id,
                question_id=r.question_id,
                correct_answer=r.correct_answer,
                winner_user_id=r.winner_user_id,
                winner_name=winner_name,
                approved=r.approved,
                approved_at=r.approved_at,
                published_at=r.published_at
            )
        )
    return response

@router.get("/admin/{question_id}", response_model=Optional[ResultResponse])
def get_draft_result(
    question_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Gets the current result (draft or published) for a question (Admin only)."""
    r = db.query(Result).filter(Result.question_id == question_id).first()
    if not r:
        return None
        
    winner_name = None
    if r.winner_user_id:
        winner = db.query(User).filter(User.id == r.winner_user_id).first()
        if winner:
            winner_name = winner.full_name
            
    return ResultResponse(
        id=r.id,
        question_id=r.question_id,
        correct_answer=r.correct_answer,
        winner_user_id=r.winner_user_id,
        winner_name=winner_name,
        approved=r.approved,
        approved_at=r.approved_at,
        published_at=r.published_at
    )

@router.post("/{question_id}/answer", response_model=WinnerPreviewResponse)
def submit_correct_answer(
    question_id: int,
    payload: ResultSubmitAnswer,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Submits the correct answer and generates a draft raffle winner (Admin only)."""
    result = winner_service.generate_winner_preview(
        db, question_id=question_id, correct_answer=payload.correct_answer
    )
    
    # Calculate eligible users count
    eligible_count = db.query(Prediction).filter(
        Prediction.question_id == question_id,
        Prediction.selected_option == payload.correct_answer
    ).count()
    
    winner_res = None
    if result.winner_user_id:
        winner = db.query(User).filter(User.id == result.winner_user_id).first()
        if winner:
            winner_res = UserResponse.model_validate(winner)
            
    return WinnerPreviewResponse(
        question_id=question_id,
        correct_answer=payload.correct_answer,
        eligible_users_count=eligible_count,
        winner=winner_res
    )

@router.post("/{question_id}/regenerate", response_model=WinnerPreviewResponse)
def regenerate_winner_raffle(
    question_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Regenerates the winner raffle (Admin only)."""
    result = winner_service.regenerate_winner(
        db, question_id=question_id, admin_id=current_admin.id
    )
    
    eligible_count = db.query(Prediction).filter(
        Prediction.question_id == question_id,
        Prediction.selected_option == result.correct_answer
    ).count()
    
    winner_res = None
    if result.winner_user_id:
        winner = db.query(User).filter(User.id == result.winner_user_id).first()
        if winner:
            winner_res = UserResponse.model_validate(winner)
            
    return WinnerPreviewResponse(
        question_id=question_id,
        correct_answer=result.correct_answer,
        eligible_users_count=eligible_count,
        winner=winner_res
    )

@router.post("/{question_id}/approve", response_model=ResultResponse)
def approve_result(
    question_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Approves the winner selection (Admin only)."""
    r = winner_service.approve_winner(db, question_id=question_id, admin_id=current_admin.id)
    
    winner_name = None
    if r.winner_user_id:
        winner = db.query(User).filter(User.id == r.winner_user_id).first()
        if winner:
            winner_name = winner.full_name
            
    return ResultResponse(
        id=r.id,
        question_id=r.question_id,
        correct_answer=r.correct_answer,
        winner_user_id=r.winner_user_id,
        winner_name=winner_name,
        approved=r.approved,
        approved_at=r.approved_at,
        published_at=r.published_at
    )

@router.post("/{question_id}/publish", response_model=ResultResponse)
def publish_result(
    question_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Publishes the winner and awards points (Admin only)."""
    r = winner_service.publish_winner(db, question_id=question_id, admin_id=current_admin.id)
    
    winner_name = None
    if r.winner_user_id:
        winner = db.query(User).filter(User.id == r.winner_user_id).first()
        if winner:
            winner_name = winner.full_name
            
    return ResultResponse(
        id=r.id,
        question_id=r.question_id,
        correct_answer=r.correct_answer,
        winner_user_id=r.winner_user_id,
        winner_name=winner_name,
        approved=r.approved,
        approved_at=r.approved_at,
        published_at=r.published_at
    )
