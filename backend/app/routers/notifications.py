from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User
from app.schemas.schemas import NotificationResponse
from app.routers.deps import get_current_user
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", response_model=List[NotificationResponse])
def read_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves all notifications for the currently logged-in user."""
    return notification_service.get_user_notifications(db, user_id=current_user.id)

@router.post("/{id}/read")
def mark_as_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marks a single notification as read."""
    success = notification_service.mark_notification_as_read(db, notification_id=id, user_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return {"detail": "Notification marked as read"}

@router.post("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marks all notifications for the current user as read."""
    notification_service.mark_all_notifications_as_read(db, user_id=current_user.id)
    return {"detail": "All notifications marked as read"}
