from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.address import Address
from app.schemas.address import (
    AddressCreate,
    AddressResponse,
)

router = APIRouter(
    prefix="/api/addresses",
    tags=["Addresses"],
)


@router.post(
    "/",
    response_model=AddressResponse,
)
def create_address(
    request: AddressCreate,
    db: Session = Depends(get_db),
):
    if request.is_default:
        db.execute(
            update(Address)
            .where(
                Address.session_id == request.session_id
            )
            .values(is_default=False)
        )

    address = Address(
        **request.model_dump()
    )

    db.add(address)
    db.commit()
    db.refresh(address)

    return address


@router.get(
    "/{session_id}",
    response_model=list[AddressResponse],
)
def get_addresses(
    session_id: str,
    db: Session = Depends(get_db),
):
    addresses = db.scalars(
        select(Address)
        .where(
            Address.session_id == session_id
        )
        .order_by(Address.created_at.desc())
    ).all()

    return addresses


@router.get(
    "/{session_id}/default",
    response_model=AddressResponse,
)
def get_default_address(
    session_id: str,
    db: Session = Depends(get_db),
):
    address = db.scalar(
        select(Address)
        .where(
            Address.session_id == session_id,
            Address.is_default.is_(True),
        )
    )

    if address is None:
        raise HTTPException(
            status_code=404,
            detail="Default address not found",
        )

    return address