from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mta_bus_api_key: str = ""
    subway_stop_ids: str = "R01N,R01S"
    bus_stop_ids: str = "553026,553102"  # 21 St / 24 Av (Q69, Q100) - both directions
    refresh_interval_seconds: int = 30
    subway_feed_url: str = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct/gtfs-nqrw"
    citibike_station_ids: str = "7186.15,7210.07,6923.20,6602.03"  # 19 St & 24 Ave, 21 St & 23 Ave, 31 St & Newtown Ave, W 41 St & 8 Ave

    model_config = {"env_file": ".env"}


settings = Settings()
