import datetime
from sqlalchemy import func, case, and_
from sqlalchemy.orm import Session
from app.models.models import User, Prediction, Result

def get_leaderboard(db: Session, timeframe: str = "overall"):
    now = datetime.datetime.utcnow()
    
    # Timeframe condition
    filter_cond = Result.published_at.isnot(None)
    if timeframe == "weekly":
        filter_cond = and_(filter_cond, Result.published_at >= now - datetime.timedelta(days=7))
    elif timeframe == "monthly":
        filter_cond = and_(filter_cond, Result.published_at >= now - datetime.timedelta(days=30))
        
    # Subquery to aggregate predictions per user within the timeframe
    stats_subquery = db.query(
        Prediction.user_id.label("user_id"),
        func.count(Prediction.id).label("total_predictions"),
        func.sum(case((Prediction.selected_option == Result.correct_answer, 1), else_=0)).label("correct_predictions")
    ).join(
        Result, Prediction.question_id == Result.question_id
    ).filter(
        filter_cond
    ).group_by(
        Prediction.user_id
    ).subquery()
    
    # Outer join to get all active users
    rankings_query = db.query(
        User.id.label("user_id"),
        User.full_name.label("full_name"),
        User.points.label("overall_points"),
        func.coalesce(stats_subquery.c.total_predictions, 0).label("total_predictions"),
        func.coalesce(stats_subquery.c.correct_predictions, 0).label("correct_predictions"),
    ).outerjoin(
        stats_subquery, User.id == stats_subquery.c.user_id
    ).filter(
        User.role == "user",
        User.status == "active"
    )
    
    rows = rankings_query.all()
    
    # Calculate points and win percentage, then sort
    formatted_rows = []
    for r in rows:
        correct = r.correct_predictions
        total = r.total_predictions
        win_pct = round((correct / total * 100), 1) if total > 0 else 0.0
        
        # For weekly/monthly, show timeframe points. For overall, show database User.points
        points = r.overall_points if timeframe == "overall" else correct * 10
        
        formatted_rows.append({
            "user_id": r.user_id,
            "full_name": r.full_name,
            "total_points": points,
            "correct_predictions": correct,
            "total_predictions": total,
            "win_percentage": win_pct
        })
        
    # Sort rankings: Points DESC, Correct predictions DESC, Total predictions DESC
    formatted_rows.sort(key=lambda x: (-x["total_points"], -x["correct_predictions"], -x["total_predictions"]))
    
    rankings = []
    for rank, row in enumerate(formatted_rows, 1):
        rankings.append({
            "rank": rank,
            **row
        })
        
    return rankings
