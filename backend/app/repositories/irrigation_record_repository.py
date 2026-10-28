"""Database operations for irrigation records."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.irrigation_record import IrrigationRecord
from app.schemas.irrigation_record import (
    IrrigationRecordCreate,
    IrrigationRecordUpdate,
)


class IrrigationRecordRepository:
    """Manage irrigation record persistence."""

    def __init__(self, session: Session):
        self.session = session

    def create(
        self,
        farm_id: UUID,
        data: IrrigationRecordCreate,
    ) -> IrrigationRecord:
        record = IrrigationRecord(
            farm_id=farm_id,
            **data.model_dump(),
        )
        self.session.add(record)
        self.session.flush()
        return record

    def get_by_id(
        self,
        record_id: UUID,
    ) -> IrrigationRecord | None:
        statement = select(IrrigationRecord).where(
            IrrigationRecord.id == record_id,
        )
        return self.session.scalar(statement)

    def get_by_id_and_farm(
        self,
        record_id: UUID,
        farm_id: UUID,
    ) -> IrrigationRecord | None:
        statement = select(IrrigationRecord).where(
            IrrigationRecord.id == record_id,
            IrrigationRecord.farm_id == farm_id,
        )
        return self.session.scalar(statement)

    def list_by_farm(
        self,
        farm_id: UUID,
    ) -> list[IrrigationRecord]:
        statement = (
            select(IrrigationRecord)
            .where(IrrigationRecord.farm_id == farm_id)
            .order_by(
                IrrigationRecord.irrigation_date.desc(),
                IrrigationRecord.created_at.desc(),
            )
        )
        return list(self.session.scalars(statement).all())

    def update(
        self,
        record: IrrigationRecord,
        data: IrrigationRecordUpdate,
    ) -> IrrigationRecord:
        updates = data.model_dump(exclude_unset=True)

        for field, value in updates.items():
            setattr(record, field, value)

        self.session.flush()
        return record

    def delete(self, record: IrrigationRecord) -> None:
        self.session.delete(record)
        self.session.flush()
