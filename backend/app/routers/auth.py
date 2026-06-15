from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.models import User
from app.schemas.schemas import UserRegister, UserResponse, Token, UserLogin
from app.routers.deps import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check if name/email already exists
    existing_user = db.query(User).filter(
        (User.email == user_in.email) | (User.full_name == user_in.full_name)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name already registered."
        )
        
    password = user_in.password or "passwordless_default_hash_123!"
    hashed_pwd = get_password_hash(password)
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        password_hash=hashed_pwd,
        role="user",
        status="active",
        points=0,
        mobile_number=user_in.mobile_number
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login_user(login_in: UserLogin, db: Session = Depends(get_db)):
    # 1. Check if the login name is the admin email
    is_admin = login_in.email == settings.ADMIN_EMAIL or login_in.email == "admin@elangode.com"
    
    # 2. Try to find user by email or full_name
    user = db.query(User).filter(
        (User.email == login_in.email) | (User.full_name == login_in.email)
    ).first()
    
    if is_admin:
        # For admin, we MUST verify the password
        if not user or not login_in.password or not verify_password(login_in.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect admin credentials",
            )
    else:
        # For regular users, we log them in by name.
        # If the user doesn't exist, we auto-create/register them!
        if not user:
            name = login_in.email.strip()
            if not name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Name cannot be empty."
                )
            
            # Check if name matches admin reserved keywords
            if name.lower() == "admin":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot register with reserved name 'admin'."
                )
            
            # Auto-register
            dummy_pwd_hash = get_password_hash("passwordless_default_hash_123!")
            user = User(
                email=name,
                full_name=name,
                password_hash=dummy_pwd_hash,
                role="user",
                status="active",
                points=0,
                mobile_number=login_in.mobile_number
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update mobile number if provided and changed
            if login_in.mobile_number and user.mobile_number != login_in.mobile_number:
                user.mobile_number = login_in.mobile_number
                db.commit()
                db.refresh(user)
            
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled or inactive."
        )
        
    # Return access & refresh tokens
    access = create_access_token(subject=user.id)
    refresh = create_refresh_token(subject=user.id)
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=Token)
def refresh_token(req: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    user_id_str = payload.get("sub")
    token_type = payload.get("type")
    if not user_id_str or token_type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token type",
        )
    user_id = int(user_id_str)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled or inactive."
        )
        
    access = create_access_token(subject=user.id)
    # Reuse or re-generate refresh token
    refresh = create_refresh_token(subject=user.id)
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer"
    }

@router.post("/logout")
def logout():
    # Stateless JWT logout doesn't require server state changes, 
    # but we provide the endpoint for front-end integration.
    return {"detail": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
