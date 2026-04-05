from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, groups, expenses, balances
from app.core.database import engine
from app.models import user, group, expense

user.Base.metadata.create_all(bind=engine)
group.Base.metadata.create_all(bind=engine)
expense.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SplitMint API", version="1.0.0", redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://splitmint.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(groups.router, prefix="/api/groups", tags=["groups"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["expenses"])
app.include_router(balances.router, prefix="/api/balances", tags=["balances"])

@app.get("/")
async def root():
    return {"message": "SplitMint API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
