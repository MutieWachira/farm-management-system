from uuid import UUID

from sqlalchemy.orm import Session

from app.models.crop import Crop
from app.repositories.crop_repository import CropRepository
from app.schemas.crop import CropCreate, CropUpdate


class CropService:
    """Business logic for crop management."""

    def __init__(self, session: Session):
        self.session = session
        self.crops = CropRepository(session)

    def create(
        self,
        field_id: UUID,
        data: CropCreate,
    ) -> Crop:
        crop = self.crops.create(
            field_id=field_id,
            data=data,
        )

        self.session.commit()
        self.session.refresh(crop)

        return crop

    def update(
        self,
        crop: Crop,
        data: CropUpdate,
    ) -> Crop:
        crop = self.crops.update(
            crop=crop,
            data=data,
        )

        self.session.commit()
        self.session.refresh(crop)

        return crop

    def delete(
        self,
        crop: Crop,
    ) -> None:
        self.crops.delete(crop)

        self.session.commit()