
from datetime import datetime, timedelta
from typing import Optional, Dict
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
import os

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable must be set")

ALGORITHM = "HS512"  # Stronger algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = 15
SESSION_RENEWAL_WINDOW = 5  # minutes before expiry to allow renewal
FERNET_KEY = base64.urlsafe_b64encode(PBKDF2HMAC(
    algorithm=hashes.SHA256(),
    length=32,
    salt=os.urandom(16),
    iterations=480000,
).derive(SECRET_KEY.encode()))
MAX_LOGIN_ATTEMPTS = 3
LOCKOUT_DURATION = 30  # minutes
PASSWORD_MIN_LENGTH = 14
PASSWORD_COMPLEXITY = {
    'uppercase': 1,
    'lowercase': 1,
    'numbers': 1,
    'special': 1
}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None
    clearance_level: str = "UNCLASSIFIED"
    last_access: datetime = None
    failed_attempts: int = 0
    account_locked_until: Optional[datetime] = None
    require_password_change: bool = False
    last_password_change: datetime = None
    session_id: Optional[str] = None
    devices: Dict[str, Dict] = {}  # Store device-specific data
    is_mobile: bool = False
    last_device: Optional[str] = None

class AccessControl:
    def __init__(self):
        self.max_session_time = timedelta(minutes=15)
        self.password_expiry_days = 60
        self.account_lockout_threshold = 3
        self.min_password_length = 14
        self.password_history_size = 10
        self.session_timeout = timedelta(minutes=2)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Please log in to access this resource",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        # Verify session is still valid
        if "exp" in payload and datetime.utcnow() > datetime.fromtimestamp(payload["exp"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return username
    except JWTError:
        raise credentials_exception
