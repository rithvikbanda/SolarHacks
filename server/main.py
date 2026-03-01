from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import solar, geocoding, incentives, geothermal, wind, simulate

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(solar.router, prefix="/api", tags=["solar"])
app.include_router(geocoding.router, prefix="/api", tags=["geocoding"])
app.include_router(incentives.router, prefix="/api", tags=["incentives"])
app.include_router(geothermal.router, prefix="/api", tags=["geothermal"])
app.include_router(wind.router, prefix="/api", tags=["wind"])
app.include_router(simulate.router, prefix="/api", tags=["simulate"])


@app.get("/")
def root():
    return {"status": "running"}
