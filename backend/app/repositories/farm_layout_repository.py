
"""Database operations for farm visualization layouts."""

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.farm_layout import FarmLayout


class FarmLayoutRepository:
    """Read and persist a farm's visual layout."""

    def __init__(self, session: Session):
        self.session = session

    def get_by_farm_id(
        self,
        farm_id: UUID,
    ) -> FarmLayout | None:
        """Return the layout for a farm, if one exists."""

        statement = select(FarmLayout).where(
            FarmLayout.farm_id == farm_id,
        )

        return self.session.scalar(statement)

    def create(
        self,
        farm_id: UUID,
        layout_data: dict[str, Any],
    ) -> FarmLayout:
        """Create a layout for a farm."""

        layout = FarmLayout(
            farm_id=farm_id,
            layout_data=layout_data,
        )

        self.session.add(layout)
        self.session.flush()

        return layout

    def update(
        self,
        layout: FarmLayout,
        layout_data: dict[str, Any],
    ) -> FarmLayout:
        """Replace a layout's geometry and canvas settings."""

        layout.layout_data = layout_data

        self.session.flush()

        return layout
