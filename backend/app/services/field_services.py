from uuid import UUID

from sqlalchemy.orm import Session

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
        field = self.fields.update(
            field=field,
            data=data,
        )

        self.session.commit()
        self.session.refresh(field)

        return field

    def delete(
        self,
        field: Field,
    ) -> None:
        self.fields.delete(field)

        self.session.commit()