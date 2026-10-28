from app.core.units import format_acres_from_hectares


def test_format_acres_from_hectares_uses_two_decimal_places() -> None:
    assert format_acres_from_hectares(1) == "2.47 acres"
    assert format_acres_from_hectares(0.40468564224) == "1.00 acres"
