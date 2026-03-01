import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import energy, incentives, geothermal, wind, simulate, report

app = FastAPI()

_allowed_origins = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(energy.router, prefix="/api", tags=["energy"])
app.include_router(incentives.router, prefix="/api", tags=["incentives"])
app.include_router(geothermal.router, prefix="/api", tags=["geothermal"])
app.include_router(wind.router, prefix="/api", tags=["wind"])
app.include_router(simulate.router, prefix="/api", tags=["simulate"])
app.include_router(report.router, prefix="/api", tags=["report"])


@app.get("/")
def root():
    return {"status": "running"}
