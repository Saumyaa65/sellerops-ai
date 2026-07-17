from fastapi import APIRouter, Header, Query, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from api.deps import get_db
from models.user import User
from models.seller import Seller
from models.schemas import ApiResponse, LoginRequest, LoginResponse

router = APIRouter()

async def get_current_seller_id(
    authorization: str = Header(None),
    token: str = Query(None),
    db: AsyncSession = Depends(get_db)
) -> str:
    actual_token = None
    if token:
        actual_token = token
    elif authorization and authorization.startswith("Bearer "):
        actual_token = authorization.split(" ")[1]

    if not actual_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token"
        )

    # In our demo, token is the user's email
    query = select(User).where(User.email == actual_token)
    result = await db.execute(query)
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    return user.seller_id


@router.post("/login", response_model=ApiResponse[LoginResponse])
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> ApiResponse[LoginResponse]:
    query = select(User).where(User.email == body.email)
    result = await db.execute(query)
    user = result.scalars().first()

    if not user or user.password != body.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Fetch seller details
    seller_query = select(Seller).where(Seller.id == user.seller_id)
    seller_result = await db.execute(seller_query)
    seller = seller_result.scalars().first()

    if not seller:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found"
        )

    return ApiResponse(
        data=LoginResponse(
            token=user.email,
            seller_id=seller.id,
            seller_name=seller.name,
            marketplace=seller.marketplace,
            seller_tier=seller.tier
        )
    )
