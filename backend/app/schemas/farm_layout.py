"""Validation schemas for the interactive farm layout."""

from typing import Annotated, Literal
from uuid import UUID
from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field as PydanticField,
    model_validator,
)


Coordinate = Annotated[
    float,
    PydanticField(ge=0, le=10_000),
]


class LayoutPoint(BaseModel):
    """A point on the visual layout canvas."""

    x: Coordinate
    y: Coordinate


class CanvasSize(BaseModel):
    """Dimensions of the visual layout canvas."""

    width: int = PydanticField(ge=100, le=10_000)
    height: int = PydanticField(ge=100, le=10_000)


class RectangleGeometry(BaseModel):
    """Position and dimensions of a rectangular field plot."""

    x: Coordinate
    y: Coordinate
    width: float = PydanticField(gt=0, le=10_000)
    height: float = PydanticField(gt=0, le=10_000)

    @model_validator(mode="after")
    def validate_bounds(self) -> "RectangleGeometry":
        if self.x + self.width > 10_000:
            raise ValueError("Rectangle exceeds the maximum canvas coordinate.")
        if self.y + self.height > 10_000:
            raise ValueError("Rectangle exceeds the maximum canvas coordinate.")
        return self


class PolygonGeometry(BaseModel):
    """A custom polygon defined by its canvas points."""

    points: list[LayoutPoint] = PydanticField(
        min_length=3,
        max_length=100,
    )


class LayoutField(BaseModel):
    """Visual placement of an existing field."""

    field_id: UUID
    shape: Literal["rectangle", "polygon"]
    rectangle: RectangleGeometry | None = None
    polygon: PolygonGeometry | None = None

    @model_validator(mode="after")
    def validate_shape_geometry(self) -> "LayoutField":
        if self.shape == "rectangle":
            if self.rectangle is None or self.polygon is not None:
                raise ValueError(
                    "Rectangle plots require rectangle geometry only."
                )

        if self.shape == "polygon":
            if self.polygon is None or self.rectangle is not None:
                raise ValueError(
                    "Polygon plots require polygon geometry only."
                )

        return self


class FarmLayoutData(BaseModel):
    """Complete editable layout for one farm."""

    schema_version: Literal[1] = 1
    canvas: CanvasSize = PydanticField(
        default_factory=lambda: CanvasSize(width=1200, height=800)
    )
    fields: list[LayoutField] = PydanticField(max_length=500)

    @model_validator(mode="after")
    def validate_unique_fields(self) -> "FarmLayoutData":
        field_ids = [item.field_id for item in self.fields]

        if len(field_ids) != len(set(field_ids)):
            raise ValueError(
                "Each field may appear only once in a farm layout."
            )

        return self


class FarmLayoutSave(BaseModel):
    """Request body for creating or updating a farm layout."""

    layout_data: FarmLayoutData


class FarmLayoutResponse(BaseModel):
    """Saved farm layout returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    farm_id: UUID
    layout_data: FarmLayoutData
    created_at: datetime
    updated_at: datetime
