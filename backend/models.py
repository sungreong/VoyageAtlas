from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class Trip(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    events: List["TravelEvent"] = Relationship(back_populates="trip")

class EventMedia(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="travelevent.id")
    url: str
    media_type: str = "image"  # pano_image, image, video
    
    event: "TravelEvent" = Relationship(back_populates="media_list")

class TravelEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: int = Field(foreign_key="trip.id")
    
    start_datetime: datetime
    from_name: str
    to_name: str
    from_lat: float
    from_lng: float
    to_lat: float
    to_lng: float
    
    transport: str = "plane"  # plane, train, car
    title: str
    note: Optional[str] = None
    
    media_list: List[EventMedia] = Relationship(
        back_populates="event",
        sa_relationship_kwargs={"cascade": "all, delete"}
    )
    trip: Trip = Relationship(back_populates="events")
