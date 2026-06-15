from sqlalchemy.orm import Session
from app.models.models import Notification, User

def create_notification(db: Session, user_id: int, title: str, message: str) -> Notification:
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification

def create_global_notification(db: Session, title: str, message: str):
    """Sends a notification to all active users."""
    users = db.query(User).filter(User.role == "user", User.status == "active").all()
    notifications = [
        Notification(user_id=user.id, title=title, message=message)
        for user in users
    ]
    if notifications:
        db.bulk_save_objects(notifications)
        db.commit()

def get_user_notifications(db: Session, user_id: int):
    return db.query(Notification).filter(Notification.user_id == user_id).order_by(Notification.created_at.desc()).all()

def mark_notification_as_read(db: Session, notification_id: int, user_id: int) -> bool:
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
        return True
    return False

def mark_all_notifications_as_read(db: Session, user_id: int):
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).update({Notification.is_read: True}, synchronize_session=False)
    db.commit()
