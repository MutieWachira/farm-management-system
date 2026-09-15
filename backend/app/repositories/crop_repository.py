from uuid import UUID

from sqlalchemy.orm import Session

from app.models.crop import Crop
from app.schemas.crop import CropCreate, CropUpdate


class CropRepository:
    """Database operations for crops."""

    def __init__(self, session: Session):
        self.session = session

    def create(
        self,
        field_id: UUID,
        data: CropCreate,
    ) -> Crop:
        crop = Crop(
            field_id=field_id,
            **data.model_dump(),
        )

        self.session.add(crop)
        self.session.flush()

        return crop

    def get_by_id(
        self,
        crop_id: UUID,
    ) -> Crop | None:
        return (
            self.session.query(Crop)
            .filter(Crop.id == crop_id)
            .first()
        )

    def get_by_id_and_field(
        self,
        crop_id: UUID,
        field_id: UUID,
    ) -> Crop | None:
        return (
            self.session.query(Crop)
            .filter(
                Crop.id == crop_id,
                Crop.field_id == field_id,
            )
            .first()
        )

    def list_by_field(
        self,
        field_id: UUID,
    ) -> list[Crop]:
        return (
            self.session.query(Crop)
            .filter(Crop.field_id == field_id)
            .order_by(Crop.created_at.asc())
            .all()
        )

    def update(
        self,
        crop: Crop,
        data: CropUpdate,
    ) -> Crop:
        updates = data.model_dump(
            exclude_unset=True,
        )

        for key, value in updates.items():
            setattr(crop, key, value)

        self.session.flush()

        return crop

    def delete(
        self,
        crop: Crop,
    ) -> None:
        self.session.delete(crop)
        self.session.flush()