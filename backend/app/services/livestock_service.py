
from datetime import date
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.livestock import Livestock, LivestockStatus
from app.repositories.livestock_repository import LivestockRepository
from app.schemas.livestock import LivestockCreate, LivestockUpdate


class LivestockService:
    """Business logic for farm livestock management."""

    def __init__(self, session: Session):
        self.session = session

    def create(
        self,
        farm_id: UUID,
        data: LivestockCreate,
    ) -> Livestock:
        """Register livestock within a farm."""

        if data.tag_number is not None:
            existing = LivestockRepository.get_by_tag_and_farm(
                db=self.session,
                tag_number=data.tag_number,
                farm_id=farm_id,
            )

            if existing is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A livestock record with this tag already exists in this farm.",
                )

        try:
            livestock = LivestockRepository.create(
                db=self.session,
                farm_id=farm_id,
                data=data,
            )

            self.session.commit()
            self.session.refresh(livestock)

            return livestock

        except IntegrityError as exc:
            self.session.rollback()

            constraint_name = getattr(
                getattr(exc.orig, "diag", None),
                "constraint_name",
                None,
            )

            if constraint_name == "uq_livestock_farm_tag_number":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A livestock record with this tag already exists in this farm.",
                ) from exc

            raise

    def get_by_id_and_farm(
        self,
        livestock_id: UUID,
        farm_id: UUID,
    ) -> Livestock:
        """Retrieve livestock while enforcing farm boundaries."""

        livestock = LivestockRepository.get_by_id_and_farm(
            db=self.session,
            livestock_id=livestock_id,
            farm_id=farm_id,
        )

        if livestock is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Livestock record not found.",
            )

        return livestock

    def list_by_farm(
        self,
        farm_id: UUID,
        *,
        search: str | None = None,
        species: str | None = None,
        status_filter: LivestockStatus | None = None,
        purpose: str | None = None,
        acquisition_date_from: date | None = None,
        acquisition_date_to: date | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Livestock], int]:
        """List livestock with filtering and bounded pagination."""

        if not 1 <= limit <= 100:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Limit must be between 1 and 100.",
            )

        if offset < 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Offset cannot be negative.",
            )

        self._validate_date_range(
            acquisition_date_from,
            acquisition_date_to,
        )

        return LivestockRepository.list_by_farm(
            db=self.session,
            farm_id=farm_id,
            search=search,
            species=species,
            status=status_filter,
            purpose=purpose,
            acquisition_date_from=acquisition_date_from,
            acquisition_date_to=acquisition_date_to,
            limit=limit,
            offset=offset,
        )

    def update(
        self,
        livestock_id: UUID,
        farm_id: UUID,
        data: LivestockUpdate,
    ) -> Livestock:
        """Update livestock details within the owning farm."""

        livestock = self.get_by_id_and_farm(
            livestock_id=livestock_id,
            farm_id=farm_id,
        )

        updates = data.model_dump(exclude_unset=True)

        required_fields = {
            "name",
            "species",
            "quantity",
            "status",
        }

        for field in required_fields:
            if field in updates and updates[field] is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"{field} cannot be null.",
                )

        new_tag = updates.get("tag_number")

        if new_tag is not None:
            existing = LivestockRepository.get_by_tag_and_farm(
                db=self.session,
                tag_number=new_tag,
                farm_id=farm_id,
                exclude_id=livestock.id,
            )

            if existing is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A livestock record with this tag already exists in this farm.",
                )

        try:
            LivestockRepository.update(
                db=self.session,
                livestock=livestock,
                data=data,
            )

            self.session.commit()
            self.session.refresh(livestock)

            return livestock

        except IntegrityError as exc:
            self.session.rollback()

            constraint_name = getattr(
                getattr(exc.orig, "diag", None),
                "constraint_name",
                None,
            )

            if constraint_name == "uq_livestock_farm_tag_number":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A livestock record with this tag already exists in this farm.",
                ) from exc

            raise

    @staticmethod
    def _validate_date_range(
        start_date: date | None,
        end_date: date | None,
    ) -> None:
        if (
            start_date is not None
            and end_date is not None
            and start_date > end_date
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Start date cannot be after end date.",
            )
