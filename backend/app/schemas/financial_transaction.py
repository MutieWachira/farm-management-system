
from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


TransactionType = Literal["income", "expense"]

IncomeCategory = Literal[
    "crop_sales",
    "livestock_sales",
    "milk_sales",
    "egg_sales",
    "other_income",
]

ExpenseCategory = Literal[
    "seeds",
    "fertilizer",
    "pesticides",
    "animal_feed",
    "labour",
    "equipment",
    "transport",
    "veterinary",
    "irrigation",
    "other_expense",
]

FinancialCategory = Literal[
    "crop_sales",
    "livestock_sales",
    "milk_sales",
    "egg_sales",
    "other_income",
    "seeds",
    "fertilizer",
    "pesticides",
    "animal_feed",
    "labour",
    "equipment",
    "transport",
    "veterinary",
    "irrigation",
    "other_expense",
]

INCOME_CATEGORIES = {
    "crop_sales",
    "livestock_sales",
    "milk_sales",
    "egg_sales",
    "other_income",
}

EXPENSE_CATEGORIES = {
    "seeds",
    "fertilizer",
    "pesticides",
    "animal_feed",
    "labour",
    "equipment",
    "transport",
    "veterinary",
    "irrigation",
    "other_expense",
}


def validate_category(
    transaction_type: str,
    category: str,
) -> None:
    """Ensure a category belongs to its transaction type."""

    allowed_categories = (
        INCOME_CATEGORIES
        if transaction_type == "income"
        else EXPENSE_CATEGORIES
    )

    if category not in allowed_categories:
        raise ValueError(
            f"Category '{category}' is not valid for "
            f"transaction type '{transaction_type}'."
        )


class FinancialTransactionCreate(BaseModel):
    """Validated data required to create a transaction."""

    transaction_type: TransactionType
    category: FinancialCategory
    amount: Decimal = Field(
        gt=0,
        max_digits=14,
        decimal_places=2,
    )
    currency_code: str = Field(
        default="KES",
        min_length=3,
        max_length=3,
        pattern=r"^[A-Za-z]{3}$",
    )
    transaction_date: date = Field(default_factory=date.today)
    description: str | None = Field(
        default=None,
        max_length=2000,
    )
    reference: str | None = Field(
        default=None,
        max_length=150,
    )

    @field_validator("currency_code")
    @classmethod
    def normalize_currency_code(cls, value: str) -> str:
        return value.upper()

    @field_validator("description", "reference")
    @classmethod
    def normalize_optional_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()
        return value or None

    @model_validator(mode="after")
    def validate_category_for_type(self):
        validate_category(
            self.transaction_type,
            self.category,
        )
        return self


class FinancialTransactionUpdate(BaseModel):
    """Fields that may be changed on an existing transaction."""

    transaction_type: TransactionType | None = None
    category: FinancialCategory | None = None
    amount: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=14,
        decimal_places=2,
    )
    currency_code: str | None = Field(
        default=None,
        min_length=3,
        max_length=3,
        pattern=r"^[A-Za-z]{3}$",
    )
    transaction_date: date | None = None
    description: str | None = Field(
        default=None,
        max_length=2000,
    )
    reference: str | None = Field(
        default=None,
        max_length=150,
    )

    @field_validator("currency_code")
    @classmethod
    def normalize_currency_code(
        cls,
        value: str | None,
    ) -> str | None:
        return value.upper() if value is not None else None

    @field_validator("description", "reference")
    @classmethod
    def normalize_optional_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()
        return value or None


class FinancialTransactionRead(BaseModel):
    """Safe response representation of a financial transaction."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    farm_id: UUID
    created_by_id: UUID
    transaction_type: TransactionType
    category: FinancialCategory
    amount: Decimal
    currency_code: str
    transaction_date: date
    description: str | None
    reference: str | None
    created_at: datetime
    updated_at: datetime


class FinancialSummaryItem(BaseModel):
    """Financial totals for one transaction type and currency."""

    transaction_type: TransactionType
    currency_code: str
    total: Decimal
