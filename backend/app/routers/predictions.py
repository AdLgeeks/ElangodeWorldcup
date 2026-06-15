from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Prediction, User
from app.schemas.schemas import PredictionCreate, PredictionResponse
from app.routers.deps import get_current_user
from app.services.prediction_service import create_prediction

router = APIRouter(prefix="/predictions", tags=["predictions"])

@router.post("/", response_model=PredictionResponse, status_code=status.HTTP_201_CREATED)
def submit_prediction(
    prediction_in: PredictionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_prediction(
        db,
        user_id=current_user.id,
        question_id=prediction_in.question_id,
        selected_option=prediction_in.selected_option
    )

@router.get("/", response_model=List[PredictionResponse])
def get_my_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    predictions = db.query(Prediction).filter(
        Prediction.user_id == current_user.id
    ).order_by(Prediction.submitted_at.desc()).all()
    return predictions
