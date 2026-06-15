from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.schemas import LeaderboardResponse
from app.routers.deps import get_current_user
from app.services import leaderboard_service
from app.models.models import User

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])

@router.get("/", response_model=LeaderboardResponse)
def get_rankings(
    timeframe: str = Query("overall", regex="^(overall|weekly|monthly)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves leaderboard rankings for the specified timeframe."""
    rankings = leaderboard_service.get_leaderboard(db, timeframe=timeframe)
    return LeaderboardResponse(timeframe=timeframe, rankings=rankings)
