
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.farm import Farm
    from app.models.user import User


class FinancialTransaction(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    """Records income and expenses associated with a farm."""

    __tablename__ = "financial_transactions"

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="ck_financial_transactions_amount_positive",
        ),
        CheckConstraint(
            "transaction_type IN ('income', 'expense')",
            name="ck_financial_transactions_type_valid",
        ),
        CheckConstraint(
            "length(currency_code) = 3",
            name="ck_financial_transactions_currency_length",
        ),
        CheckConstraint(
            """
            (
                transaction_type = 'income'
                AND category IN (
                    'crop_sales',
                    'livestock_sales',
                    'milk_sales',
                    'egg_sales',
                    'other_income'
                )
            )
            OR
            (
                transaction_type = 'expense'
                AND category IN (
                    'seeds',
                    'fertilizer',
                    'pesticides',
                    'animal_feed',
                    'labour',
                    'equipment',
                    'transport',
                    'veterinary',
                    'irrigation',
                    'other_expense'
                )
            )
            """,
            name="ck_financial_transactions_category_matches_type",
        ),
        Index(
            "ix_financial_transactions_farm_date",
            "farm_id",
            "transaction_date",
        ),
    )

    farm_id: Mapped[UUID] = mapped_column(
        ForeignKey("farms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_by_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    transaction_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    category: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        index=True,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )

    currency_code: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="KES",
    )

    transaction_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        default=date.today,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    reference: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    farm: Mapped[Farm] = relationship("Farm")

    created_by: Mapped[User] = relationship("User")
