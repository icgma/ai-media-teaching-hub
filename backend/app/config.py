"""
Application settings — all config loaded from environment variables.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # --- LLM ---
    teacher_api_key: str = ""
    teacher_base_url: str = "https://api.deepseek.com/v1"
    teacher_model: str = "deepseek-chat"

    minimax_api_key_1: str = ""
    minimax_api_key_2: str = ""
    minimax_api_key_3: str = ""
    minimax_api_key_4: str = ""
    minimax_api_key_5: str = ""

    minimax_base_url: str = "https://api.minimax.chat/v1"
    minimax_model: str = "MiniMax-Text-01"

    # --- Auth ---
    teacher_password: str = "changeme"
    student_access_code: str = "stu2025"
    jwt_secret: str = "change-this-to-a-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480  # 8 hours

    # --- App ---
    cors_origins: str = "*"

    @property
    def minimax_keys(self) -> list[str]:
        """Return all non-empty MiniMax keys for round-robin."""
        keys = [
            self.minimax_api_key_1,
            self.minimax_api_key_2,
            self.minimax_api_key_3,
            self.minimax_api_key_4,
            self.minimax_api_key_5,
        ]
        return [k for k in keys if k and k != "sk-key"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
