from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.farm_activity import FarmActivity
from app.schemas.farm_activity import (
    FarmActivityCreate,
    FarmActivityUpdate,
)


class FarmActivityRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, farm_id: UUID, data: FarmActivityCreate,) -> FarmActivity:
        activity=FarmActivity(farm_id=farm_id, **data.model_dump(),)
        self.session.add(activity)
        self.session.flush()
        return activity

    def get_by_id(self, activity_id: UUID,) -> FarmActivity | None:
        statement = select(FarmActivity).where(FarmActivity.id == activity_id)
        return self.session.scalar(statement)

    def get_by_id_and_farm(self, activity_id: UUID, farm_id: UUID,) -> FarmActivity | None:
        statement = select(FarmActivity).where(FarmActivity.id == activity_id,
                                               FarmActivity.farm_id == farm_id,)
        return self.session.scalar(statement)

    def list_by_farm(self, farm_id: UUID,) -> list[FarmActivity]:
        statement = (select(FarmActivity).where(FarmActivity.farm_id == farm_id)
                     .order_by(FarmActivity.activity_date.desc(),
                                FarmActivity.created_at.desc(),))
        return list(self.session.scalars(statement).all()
                    )
    def update(self, activity: FarmActivity, data: FarmActivityUpdate) -> FarmActivity:
        for field, value in data.model_dump().items():
            setattr(activity, field, value)
        self.session.flush()
        return activity

    def delete(self, activity: FarmActivity,) -> None:
        self.session.delete(activity)
        self.session.flush()
    