from uuid import UUID

from app.core.enums import FarmRole
from app.models.farm_membership import FarmMembership
from sqlalchemy.orm import Session
from app.models.farm import Farm
from app.repositories.farm_repository import FarmRepository
from app.schemas.farm import FarmCreate, FarmUpdate

class FarmService:
    """Business logic for farm management."""
    def __init__(self, session: Session) -> None:
        self.session = session
        self.farms = FarmRepository(session)

    def create (self, owner_id: UUID, data: FarmCreate,) -> Farm:
        """Create a farm owned by the authenticated user."""
        farm = Farm(
            owner_id=owner_id,
            name=data.name.strip(),
            location=data.location.strip(),
            area_hectares=data.area_hectares,
            description=(
                data.description.strip()
                if data.description
                else None
            ),
        )
        farm.memberships.append(FarmMembership(user_id=owner_id, role=FarmRole.OWNER))
        self.farms.create(farm)
        self.session.commit()

        return farm

    def update(self, farm: Farm, data: FarmUpdate,) -> Farm:
        """Update an existing owned farm"""
        changes = data.model_dump(exclude_unset=True,)

        if "name" in changes:
            farm.name = changes["name"].strip()

        if "location" in changes:
            farm.location = changes["location"].strip()

        if "area_hectares" in changes:
            farm.area_hectares = changes["area_hectares"]

        if "description" in changes:
            farm.description = (
                changes["description"].strip()
                if changes["description"]
                else None
            )

        self.session.commit()

        return farm

    def delete(self, farm: Farm) -> None:
        """Delete an existing owned farm."""
        self.farms.delete(farm)
        self.session.commit()

    
