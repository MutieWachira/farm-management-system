
"""Business logic for farm visualization layouts."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.field import Field
from app.models.farm_layout import FarmLayout
from app.repositories.farm_layout_repository import (
    FarmLayoutRepository,
)
from app.schemas.farm_layout import FarmLayoutData


class FarmLayoutService:
    """Validate and manage farm visualization layouts."""

    def __init__(self, session: Session):
        self.session = session
        self.layouts = FarmLayoutRepository(session)

    def get_by_farm_id(
        self,
        farm_id: UUID,
    ) -> FarmLayout | None:
        """Return a farm's saved layout, if it exists."""

        return self.layouts.get_by_farm_id(farm_id)

    def save(
        self,
        farm_id: UUID,
        data: FarmLayoutData,
    ) -> FarmLayout:
        """Create or update a farm layout after validating its fields."""

        self._validate_field_ownership(
            farm_id=farm_id,
            data=data,
        )

        layout = self.layouts.get_by_farm_id(farm_id)

        # Convert UUIDs and other values into JSON-compatible values.
        layout_data = data.model_dump(mode="json")

        try:
            if layout is None:
                layout = self.layouts.create(
                    farm_id=farm_id,
                    layout_data=layout_data,
                )
            else:
                layout = self.layouts.update(
                    layout=layout,
                    layout_data=layout_data,
                )

            self.session.commit()
            self.session.refresh(layout)

            return layout

        except IntegrityError as exc:
            self.session.rollback()

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "The farm layout could not be saved because "
                    "another request may have changed it. "
                    "Reload the layout and try again."
                ),
            ) from exc

        except Exception:
            self.session.rollback()
            raise

    def _validate_field_ownership(
        self,
        *,
        farm_id: UUID,
        data: FarmLayoutData,
    ) -> None:
        """Ensure every layout field belongs to the requested farm."""

        requested_ids = {
            item.field_id
            for item in data.fields
        }

        if not requested_ids:
            return

        statement = select(Field.id).where(
            Field.farm_id == farm_id,
            Field.id.in_(requested_ids),
        )

        existing_ids = set(self.session.scalars(statement).all())

        if existing_ids != requested_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "One or more fields do not belong to this farm "
                    "or no longer exist."
                ),
            )
