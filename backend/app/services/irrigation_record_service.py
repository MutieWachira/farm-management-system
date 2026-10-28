"""Business logic for irrigation record management."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.field import Field
from app.models.irrigation_record import IrrigationRecord
from app.repositories.irrigation_record_repository import (
    IrrigationRecordRepository,
)
from app.schemas.irrigation_record import (
    IrrigationRecordCreate,
    IrrigationRecordUpdate,
)


class IrrigationRecordService:
    """Manage irrigation records and enforce farm-field relationships."""

    REQUIRED_UPDATE_FIELDS = (
        "field_id",
        "irrigation_date",
        "method",
        "duration_minutes",
        "water_volume_liters",
    )

    def __init__(self, session: Session):
        self.session = session
        self.repository = IrrigationRecordRepository(session)

    def _validate_field(self, farm_id: UUID, field_id: UUID) -> None:
        statement = select(Field).where(
            Field.id == field_id,
            Field.farm_id == farm_id,
        )
        field = self.session.scalar(statement)

        if field is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Field not found in this farm.",
            )

    def create(
        self,
        farm_id: UUID,
        data: IrrigationRecordCreate,
    ) -> IrrigationRecord:
        self._validate_field(
            farm_id=farm_id,
            field_id=data.field_id,
        )

        record = self.repository.create(
            farm_id=farm_id,
            data=data,
        )

        self.session.commit()
        self.session.refresh(record)

        return record

    def update(
        self,
        record: IrrigationRecord,
        data: IrrigationRecordUpdate,
    ) -> IrrigationRecord:
        changes = data.model_dump(exclude_unset=True)

        # Required database columns must never be explicitly set to null.
        for field_name in self.REQUIRED_UPDATE_FIELDS:
            if field_name in changes and changes[field_name] is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"{field_name} cannot be null.",
                )

        # The selected field must belong to the record's farm.
        if "field_id" in changes:
            self._validate_field(
                farm_id=record.farm_id,
                field_id=changes["field_id"],
            )

        record = self.repository.update(
            record=record,
            data=data,
        )

        self.session.commit()
        self.session.refresh(record)

        return record

    def delete(self, record: IrrigationRecord) -> None:
        self.repository.delete(record)
        self.session.commit()
