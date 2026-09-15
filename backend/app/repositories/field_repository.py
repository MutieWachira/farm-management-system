from uuid import UUID

from sqlalchemy.orm import Session

from app.models.field import Field
from app.schemas.field import FieldCreate, FieldUpdate


class FieldRepository:
    """Database operations for fields."""

    def __init__(self, session: Session):
        self.session = session

    def create(
        self,
        farm_id: UUID,
        data: FieldCreate,
    ) -> Field:
        field = Field(
            farm_id=farm_id,
            **data.model_dump(),
        )

        self.session.add(field)
        self.session.flush()

        return field

    def get_by_id(
        self,
        field_id: UUID,
    ) -> Field | None:
        return (
            self.session.query(Field)
            .filter(Field.id == field_id)
            .first()
        )

    def list_by_farm(
        self,
        farm_id: UUID,
    ) -> list[Field]:
        return (
            self.session.query(Field)
            .filter(Field.farm_id == farm_id)
            .order_by(Field.created_at.asc())
            .all()
        )

    def update(
        self,
        field: Field,
        data: FieldUpdate,
    ) -> Field:
        updates = data.model_dump(
            exclude_unset=True,
        )

        for key, value in updates.items():
            setattr(field, key, value)

        self.session.flush()

        return field

    def delete(
        self,
        field: Field,
    ) -> None:
        self.session.delete(field)
        self.session.flush()