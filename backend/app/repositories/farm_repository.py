from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.farm import Farm 

class FarmRepository:
    """Database operations for farms"""
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, farm : Farm) -> Farm:
        """Persist a new farm"""
        self.session.add(farm)
        self.session.flush()
        return farm

    def get_by_id(self, farm_id: UUID) -> Farm | None:
        """Find a farm by its ID"""
        return self.session.get(Farm, farm_id)

    def list_by_owner(self, owner_id:UUID) -> list[Farm]:
        """Return all farms owned by a user"""
        statement = (select(Farm)
                     .where(Farm.owner_id == owner_id)
                     .order_by(Farm.created_at.desc())
                     )
        return list(
            self.session.scalars(statement).all()
        )

    def delete(self, farm: Farm) -> None:
        """Delete a farm"""
        self.session.delete(farm)
        self.session.flush()