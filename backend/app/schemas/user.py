from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    display_name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    display_name: str
    avatar_color: str
    avatar_base64: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_base64: Optional[str] = None


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

    @validator("confirm_password")
    def passwords_match(cls, v, values, **kwargs):
        if "new_password" in values and v != values["new_password"]:
            raise ValueError("Yeni şifreler birbiriyle eşleşmiyor")
        return v


class UserDeleteRequest(BaseModel):
    password: str

