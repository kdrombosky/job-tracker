from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str  # required — no default, fail loudly if unset rather than run against nothing
    app_password: str = "change-me"
    secret_key: str = "change-me-too"
    access_token_expire_minutes: int = 43200  # 30 days
    allowed_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        # Normalize the legacy "postgres://" scheme some providers still hand out.
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
