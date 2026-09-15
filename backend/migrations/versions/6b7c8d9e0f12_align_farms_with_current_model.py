"""align farms table with the current farm model

Revision ID: 6b7c8d9e0f12
Revises: 0ffab6fd1799
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "6b7c8d9e0f12"
down_revision: Union[str, Sequence[str], None] = "0ffab6fd1799"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_farms_area_positive", "farms", type_="check")
    op.add_column("farms", sa.Column("owner_id", sa.Uuid(), nullable=True))
    op.add_column("farms", sa.Column("area_hectares", sa.Float(), nullable=True))
    op.execute(
        sa.text(
            "UPDATE farms SET area_hectares = area "
            "WHERE area IS NOT NULL"
        )
    )
    op.drop_column("farms", "area")
    op.create_index("ix_farms_owner_id", "farms", ["owner_id"], unique=False)
    op.create_foreign_key(
        "fk_farms_owner_id_users",
        "farms",
        "users",
        ["owner_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.alter_column("farms", "location", existing_type=sa.String(length=255), nullable=False)
    op.alter_column("farms", "owner_id", existing_type=sa.Uuid(), nullable=False)
    op.create_check_constraint(
        "ck_farms_area_positive",
        "farms",
        "area_hectares IS NULL OR area_hectares > 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_farms_area_positive", "farms", type_="check")
    op.alter_column("farms", "owner_id", existing_type=sa.Uuid(), nullable=True)
    op.alter_column("farms", "location", existing_type=sa.String(length=255), nullable=True)
    op.drop_constraint("fk_farms_owner_id_users", "farms", type_="foreignkey")
    op.drop_index("ix_farms_owner_id", table_name="farms")
    op.add_column("farms", sa.Column("area", sa.Numeric(precision=12, scale=2), nullable=True))
    op.execute(
        sa.text(
            "UPDATE farms SET area = area_hectares "
            "WHERE area_hectares IS NOT NULL"
        )
    )
    op.drop_column("farms", "area_hectares")
    op.drop_column("farms", "owner_id")
    op.create_check_constraint(
        "ck_farms_area_positive",
        "farms",
        "area IS NULL OR area > 0",
    )