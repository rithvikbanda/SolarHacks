import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI

router = APIRouter()


class SummaryRequest(BaseModel):
    system_size_kw: Optional[float] = None
    panel_count: Optional[int] = None
    solar_production_kwh: Optional[float] = None
    price_per_kwh: Optional[float] = None
    gross_cost: Optional[float] = None
    net_cost: Optional[float] = None
    payback_years: Optional[float] = None
    incentives_total: Optional[float] = None
    wind_feasible: Optional[bool] = None
    wind_classification: Optional[str] = None
    geothermal_score: Optional[int] = None
    geothermal_suitability: Optional[str] = None
    carbon_offset_tons: Optional[float] = None
    state: Optional[str] = None


@router.post("/ai-summary")
def get_ai_summary(req: SummaryRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    facts: list[str] = []

    # Solar sizing
    if req.system_size_kw is not None:
        if req.panel_count is not None:
            facts.append(f"System size: {req.system_size_kw:.1f} kW ({req.panel_count} panels)")
        else:
            facts.append(f"System size: {req.system_size_kw:.1f} kW")

    # Solar production
    if req.solar_production_kwh is not None:
        facts.append(f"Annual solar production: {req.solar_production_kwh:,.0f} kWh/year")

    # Utility rate
    if req.price_per_kwh is not None:
        facts.append(f"Local electricity rate: ${req.price_per_kwh:.3f}/kWh")

    # Costs
    if req.gross_cost is not None:
        facts.append(f"Gross system cost: ${req.gross_cost:,.0f}")
    if req.net_cost is not None:
        facts.append(f"Net cost after incentives: ${req.net_cost:,.0f}")
    if req.payback_years is not None:
        facts.append(f"Estimated payback: {req.payback_years:.1f} years")
    if req.incentives_total is not None:
        facts.append(f"Available incentives (IRA + rebates): ${req.incentives_total:,.0f}")

    # Carbon impact
    if req.carbon_offset_tons is not None:
        facts.append(f"20-year carbon offset: {req.carbon_offset_tons:.0f} tons CO\u2082")

    # Wind
    if req.wind_classification:
        if req.wind_feasible is None:
            facts.append(f"Wind potential: {req.wind_classification}")
        else:
            wind_status = "feasible" if req.wind_feasible else "not recommended"
            facts.append(f"Wind potential: {req.wind_classification} ({wind_status})")

    # Geothermal
    if req.geothermal_suitability:
        if req.geothermal_score is None:
            facts.append(f"Geothermal suitability: {req.geothermal_suitability}")
        else:
            facts.append(f"Geothermal suitability: {req.geothermal_suitability} (score {req.geothermal_score}/5)")

    # Location
    if req.state:
        facts.append(f"State: {req.state}")

    facts_text = "\n".join(f"- {f}" for f in facts) if facts else "- (No report data provided.)"

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model="gpt-4o",
        max_tokens=250,
        temperature=0.5,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a home energy analyst providing clear, practical recommendations. "
"Write 3 to 4 complete sentences based only on the provided report data. "
"Do not invent, estimate, or assume any values.\n\n"

"If solar production, cost, and payback data are available, solar must remain the primary recommendation. "
"You may mention wind OR geothermal (at most one) only if it meaningfully affects the decision.\n\n"

"Connect system size, annual production, cost, and payback into a clear implication about long-term value. "

"If carbon offset data is provided, reference only the exact carbon_offset_tons value supplied in the report. "
"Do not calculate, reinterpret, or adjust this number. Do not introduce alternative carbon totals.\n\n"

"If the total cost exceeds **$50,000**, you must explicitly state that this is a significant investment.\n\n"

"If the payback period exceeds **12 years**, you must explicitly state that this is a long-term investment.\n\n"

"Every numeric value must be wrapped in Markdown bold using **like this**. "
"This includes kW, kWh, dollar amounts, rates, payback years, tonnage, and scores. "
"If any number appears without bold formatting, the response is invalid.\n\n"

"Use simple, confident, analytical language. Avoid buzzwords, hype, or marketing phrasing. "
"No bullet points. Do not begin with generic phrases."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Write a 3-4 sentence personalized recommendation based on this solar analysis:\n\n"
                    f"{facts_text}"
                ),
            },
        ],
    )

    return {"summary": response.choices[0].message.content}