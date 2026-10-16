"""Correct inventory item schema.

Revision ID: 6ebede9793eb
Revises: 18b071042e45
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "6ebede9793eb"
down_revision: Union[str, Sequence[str], None] = "18b071042e45"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Align inventory_items with the SQLAlchemy model."""

    # Correct the misspelled column without losing its existing values.
    op.alter_column(
        "inventory_items",
        "reoder_level",
        new_column_name="reorder_level",
        existing_type=sa.Numeric(precision=14, scale=3),
        existing_nullable=False,
    )

    # SKU is optional in the application model.
    op.alter_column(
        "inventory_items",
        "sku",
        existing_type=sa.String(length=80),
        nullable=True,
    )

    # Enforce inventory validation at the database level.
    op.create_check_constraint(
        "ck_inventory_items_stock_nonnegative",
        "inventory_items",
        "current_stock >= 0",
    )

    op.create_check_constraint(
        "ck_inventory_items_reorder_nonnegative",
        "inventory_items",
        "reorder_level >= 0",
    )

    # A SKU must be unique within a farm when provided.
    # PostgreSQL allows multiple NULL values in this constraint.
    op.create_unique_constraint(
        "uq_inventory_items_farm_sku",
        "inventory_items",
        ["farm_id", "sku"],
    )

    # Support inventory lookups by farm and item name.
    op.create_index(
        "ix_inventory_items_farm_name",
        "inventory_items",
        ["farm_id", "name"],
        unique=False,
    )


def downgrade() -> None:
    """Reverse the schema changes."""

    op.drop_index(
        "ix_inventory_items_farm_name",
        table_name="inventory_items",
    )

    op.drop_constraint(
        "uq_inventory_items_farm_sku",
        "inventory_items",
        type_="unique",
    )

    op.drop_constraint(
        "ck_inventory_items_reorder_nonnegative",
        "inventory_items",
        type_="check",
    )

    op.drop_constraint(
        "ck_inventory_items_stock_nonnegative",
        "inventory_items",
        type_="check",
    )

    # Downgrade requires every SKU to be populated.
    op.alter_column(
        "inventory_items",
        "sku",
        existing_type=sa.String(length=80),
        nullable=False,
    )

    op.alter_column(
        "inventory_items",
        "reorder_level",
        new_column_name="reoder_level",
        existing_type=sa.Numeric(precision=14, scale=3),
        existing_nullable=False,
    )
