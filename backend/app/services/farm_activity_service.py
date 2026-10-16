from uuid import UUID

from sqlalchemy.orm import Session

from app.models.farm_activity import FarmActivity
from app.repositories.farm_activity_repository import (
    FarmActivityRepository,
)
from app.schemas.farm_activity import (
    FarmActivityCreate,
    FarmActivityUpdate,
)


class FarmActivityService:
    def __init__(self, session: Session):
        self.session = session
        self.repository = FarmActivityRepository(session)

    def create(
        self,
        farm_id: UUID,
        data: FarmActivityCreate,
    ) -> FarmActivity:
        activity = self.repository.create(
            farm_id=farm_id,
            data=data,
        )

        self.session.commit()
        self.session.refresh(activity)

        return activity

    def update(
        self,
        activity: FarmActivity,
        data: FarmActivityUpdate,
    ) -> FarmActivity:
        activity = self.repository.update(
            activity=activity,
            data=data,
        )

        self.session.commit()
        self.session.refresh(activity)

        return activity

    def delete(
        self,
        activity: FarmActivity,
    ) -> None:
        self.repository.delete(activity)
        self.session.commit()