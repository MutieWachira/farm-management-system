HECTARES_PER_ACRE = 0.40468564224


def format_acres_from_hectares(area_hectares: float) -> str:
    area_acres = area_hectares / HECTARES_PER_ACRE
    return f"{area_acres:,.2f} acres"
