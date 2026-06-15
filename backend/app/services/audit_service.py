from sqlalchemy.orm import Session
from app.models.models import AuditLog

def log_audit_action(db: Session, admin_id: int, action: str) -> AuditLog:
    log = AuditLog(
        admin_id=admin_id,
        action=action
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

def get_audit_logs(db: Session, limit: int = 100):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
