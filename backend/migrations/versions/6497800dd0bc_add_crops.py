"""add crops

Revision ID: 6497800dd0bc
Revises: 8bb01e4da350
Create Date: 2026-09-15 12:54:00.054047

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6497800dd0bc"
down_revision: Union[str, Sequence[str], None] = "8bb01e4da350"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # ------------------------------------------------------------------
    # Create crops table
    # ------------------------------------------------------------------
    op.create_table(
        "crops",
        sa.Column("field_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("variety", sa.String(length=150), nullable=True),
        sa.Column("planting_date", sa.Date(), nullable=False),
        sa.Column("expected_harvest_date", sa.Date(), nullable=False),
        sa.Column("actual_harvest_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("area_hectares", sa.Float(), nullable=False),
        sa.Column("expected_yield", sa.Float(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["field_id"],
            ["fields.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_crops_field_id"),
        "crops",
        ["field_id"],
        unique=False,
    )

    # ------------------------------------------------------------------
    # Convert farm_memberships.role from VARCHAR to farm_role enum
    #
    # PostgreSQL cannot automatically cast VARCHAR to an enum.
    # The USING clause explicitly tells PostgreSQL how to perform
    # the conversion.
    # ------------------------------------------------------------------
    op.execute(
        """
        ALTER TABLE farm_memberships
        ALTER COLUMN role TYPE farm_role
        USING role::farm_role
        """
    )


def downgrade() -> None:
    """Downgrade schema."""

    # ------------------------------------------------------------------
    # Convert farm_memberships.role back to VARCHAR
    # ------------------------------------------------------------------
    op.execute(
        """
        ALTER TABLE farm_memberships
        ALTER COLUMN role TYPE VARCHAR(20)
        USING role::text
        """
    )

    # ------------------------------------------------------------------
    # Remove crops table
    # ------------------------------------------------------------------
    op.drop_index(
        op.f("ix_crops_field_id"),
        table_name="crops",
    )

    op.drop_table("crops")