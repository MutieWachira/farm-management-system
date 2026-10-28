from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.units import format_acres_from_hectares
from app.models.farm import Farm
from app.models.field import Field
from app.repositories.field_repository import FieldRepository
from app.schemas.field import FieldCreate, FieldUpdate


class FieldService:
    """Business logic for field management."""

    def __init__(self, session: Session):
        self.session = session
        self.fields = FieldRepository(session)

    def create(
        self,
        farm_id: UUID,
        data: FieldCreate,
    ) -> Field:
        farm = self.session.scalar(
            select(Farm)
            .where(Farm.id == farm_id)
            .with_for_update()
        )

        if farm is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Farm not found.",
            )

        self._validate_area(
            farm=farm,
            area_hectares=data.area_hectares,
        )

        field = self.fields.create(
            farm_id=farm_id,
            data=data,
        )

        self.session.commit()
        self.session.refresh(field)

        return field

    def update(
        self,
        field: Field,
        data: FieldUpdate,
    ) -> Field:
        changes = data.model_dump(exclude_unset=True)

        if "area_hectares" in changes:
            if changes["area_hectares"] is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Field area must be greater than zero.",
                )

            farm = self.session.scalar(
                select(Farm)
                .where(Farm.id == field.farm_id)
                .with_for_update()
            )

            if farm is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Farm not found.",
                )

            self._validate_area(
                farm=farm,
                area_hectares=changes["area_hectares"],
                exclude_field_id=field.id,
            )

        field = self.fields.update(
            field=field,
            data=data,
        )

        self.session.commit()
        self.session.refresh(field)

        return field

    def _validate_area(
        self,
        *,
        farm: Farm,
        area_hectares: float,
        exclude_field_id: UUID | None = None,
    ) -> None:
        if farm.area_hectares is None:
            return

        total_area = self.fields.total_area_by_farm(
            farm.id,
            exclude_field_id=exclude_field_id,
        )

        if total_area + area_hectares > farm.area_hectares:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Total field area cannot exceed the farm area "
                    f"of {format_acres_from_hectares(farm.area_hectares)}."
                ),
            )

    def delete(
        self,
        field: Field,
    ) -> None:
        self.fields.delete(field)

        self.session.commit()