from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379"
    GEMINI_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_JWT_SECRET: str
    CLIENT_URL: str = "http://localhost:5173"
    PORT: int = 3001

    class Config:
        env_file = ".env"


settings = Settings()
