from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mta_bus_api_key: str = ""
    refresh_interval_seconds: int = 30
    data_dir: str = "data/configs"

    model_config = {"env_file": ".env"}


settings = Settings()
