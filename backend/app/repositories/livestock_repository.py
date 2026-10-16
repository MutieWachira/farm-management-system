
from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.livestock import Livestock, LivestockStatus
from app.schemas.livestock import LivestockCreate, LivestockUpdate


class LivestockRepository:
    """Database operations for farm livestock records."""

    @staticmethod
    def create(
        db: Session,
        farm_id: UUID,
        data: LivestockCreate,
    ) -> Livestock:
        livestock = Livestock(
            farm_id=farm_id,
            **data.model_dump(),
        )
        db.add(livestock)
        db.flush()
        return livestock

    @staticmethod
    def get_by_id(
        db: Session,
        livestock_id: UUID,
    ) -> Livestock | None:
        statement = select(Livestock).where(
            Livestock.id == livestock_id
        )
        return db.scalar(statement)

    @staticmethod
    def get_by_id_and_farm(
        db: Session,
        livestock_id: UUID,
        farm_id: UUID,
    ) -> Livestock | None:
        statement = select(Livestock).where(
            Livestock.id == livestock_id,
            Livestock.farm_id == farm_id,
        )
        return db.scalar(statement)

    @staticmethod
    def get_by_tag_and_farm(
        db: Session,
        tag_number: str,
        farm_id: UUID,
        exclude_id: UUID | None = None,
    ) -> Livestock | None:
        statement = select(Livestock).where(
            Livestock.farm_id == farm_id,
            Livestock.tag_number == tag_number,
        )

        if exclude_id is not None:
            statement = statement.where(
                Livestock.id != exclude_id
            )

        return db.scalar(statement)

    @staticmethod
    def list_by_farm(
        db: Session,
        farm_id: UUID,
        *,
        search: str | None = None,
        species: str | None = None,
        status: LivestockStatus | None = None,
        purpose: str | None = None,
        acquisition_date_from: date | None = None,
        acquisition_date_to: date | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Livestock], int]:
        statement = select(Livestock).where(
            Livestock.farm_id == farm_id
        )

        if search:
            search_term = f"%{search.strip()}%"
            statement = statement.where(
                Livestock.name.ilike(search_term)
                | Livestock.species.ilike(search_term)
                | Livestock.breed.ilike(search_term)
                | Livestock.tag_number.ilike(search_term)
            )

        if species:
            statement = statement.where(
                func.lower(Livestock.species) == species.strip().lower()
            )

        if status is not None:
            statement = statement.where(
                Livestock.status == status
            )

        if purpose:
            statement = statement.where(
                func.lower(Livestock.purpose) == purpose.strip().lower()
            )

        if acquisition_date_from is not None:
            statement = statement.where(
                Livestock.acquisition_date >= acquisition_date_from
            )

        if acquisition_date_to is not None:
            statement = statement.where(
                Livestock.acquisition_date <= acquisition_date_to
            )

        count_statement = select(func.count()).select_from(
            statement.order_by(None).subquery()
        )
        total = db.scalar(count_statement) or 0

        statement = (
            statement
            .order_by(Livestock.created_at.desc(), Livestock.id)
            .offset(offset)
            .limit(limit)
        )

        return list(db.scalars(statement).all()), total

    @staticmethod
    def update(
        db: Session,
        livestock: Livestock,
        data: LivestockUpdate,
    ) -> Livestock:
        for field, value in data.model_dump(
            exclude_unset=True
        ).items():
            setattr(livestock, field, value)

        db.flush()
        return livestock

    @staticmethod
    def delete(
        db: Session,
        livestock: Livestock,
    ) -> None:
        db.delete(livestock)
        db.flush()
