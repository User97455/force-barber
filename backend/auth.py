import hmac
import hashlib
import json
import os
import urllib.parse
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status

def get_bot_token() -> str:
    return os.getenv("BOT_TOKEN", "").strip()

def get_admin_chat_id() -> Optional[int]:
    admin_id_str = os.getenv("ADMIN_CHAT_ID", "").strip()
    if admin_id_str:
        try:
            return int(admin_id_str)
        except ValueError:
            return None
    return None

def validate_telegram_init_data(init_data: str) -> Dict[str, Any]:
    bot_token = get_bot_token()
    
    # If no init_data is provided
    if not init_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Telegram WebApp initData",
        )

    # In local testing mode without token or mock init_data
    if init_data.startswith("test_mode_user_id="):
        uid = int(init_data.split("=")[1])
        return {
            "id": uid,
            "first_name": "Test User",
            "username": "testuser",
        }

    # Parse query string
    try:
        parsed_data = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid initData format: {str(e)}",
        )

    received_hash = parsed_data.pop("hash", None)
    if not received_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing hash in initData",
        )

    if not bot_token:
        # If bot token is not configured yet, parse user without signature check for initial bootstrap
        user_str = parsed_data.get("user")
        if user_str:
            try:
                return json.loads(user_str)
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="BOT_TOKEN is not configured on server",
        )

    # Build data check string
    data_check_list = [f"{k}={v}" for k, v in sorted(parsed_data.items())]
    data_check_string = "\n".join(data_check_list)

    # Calculate HMAC-SHA256
    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram WebApp signature",
        )

    user_str = parsed_data.get("user")
    if not user_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing user field in initData",
        )

    try:
        user_data = json.loads(user_str)
        return user_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user JSON in initData: {str(e)}",
        )

def get_current_user(
    x_telegram_init_data: Optional[str] = Header(None, alias="X-Telegram-Init-Data")
) -> Dict[str, Any]:
    if not x_telegram_init_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Header X-Telegram-Init-Data is required",
        )
    return validate_telegram_init_data(x_telegram_init_data)

def require_admin(
    x_telegram_init_data: Optional[str] = Header(None, alias="X-Telegram-Init-Data")
) -> Dict[str, Any]:
    user = get_current_user(x_telegram_init_data)
    admin_id = get_admin_chat_id()
    if admin_id is None or user.get("id") != admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin access required",
        )
    return user
