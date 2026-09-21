"""SQLAlchemy models — Rooms, Guests, Bookings (SQLite default, Postgres-ready)."""

from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    create_engine,
    func,
    select,
)
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
    sessionmaker,
)

from .config import config

ROOM_TYPES: dict[str, dict] = {
    "deluxe": {
        "label": "Deluxe Room",
        "price_per_night": 3500.00,
        "max_guests": 2,
        "total_rooms": 40,
        "features": "1 Queen bed, city view, complimentary Wi-Fi",
    },
    "executive": {
        "label": "Executive Room",
        "price_per_night": 6000.00,
        "max_guests": 3,
        "total_rooms": 12,
        "features": "1 King bed, sea view, free breakfast, extra bed ₹1,200",
    },
}
GST_RATE = 0.12
CHECKIN_TIME = "2:00 PM"
CHECKOUT_TIME = "12:00 noon"

engine = create_engine(
    config.database_url,
    echo=False,
    connect_args={"check_same_thread": False}
    if config.database_url.startswith("sqlite")
    else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Room(Base):
    """A physical room in the hotel, by type and number."""

    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    room_number: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    room_type: Mapped[str] = mapped_column(String(20), nullable=False)
    floor: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    bookings: Mapped[list["Booking"]] = relationship(back_populates="room")

    __table_args__ = (
        CheckConstraint(
            "room_type IN ('deluxe','executive')",
            name="ck_rooms_type",
        ),
    )


class Guest(Base):
    __tablename__ = "guests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(15), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    bookings: Mapped[list["Booking"]] = relationship(back_populates="guest")

    __table_args__ = (UniqueConstraint("phone", name="uq_guests_phone"),)


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    booking_ref: Mapped[str] = mapped_column(String(12), unique=True, nullable=False)
    guest_id: Mapped[int] = mapped_column(
        ForeignKey("guests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    room_id: Mapped[int | None] = mapped_column(
        ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True
    )
    room_type: Mapped[str] = mapped_column(String(20), nullable=False)
    check_in: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    check_out: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    guests: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    price_per_night: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    gst_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(12), default="confirmed", nullable=False)
    special_requests: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    guest: Mapped["Guest"] = relationship(back_populates="bookings")
    room: Mapped[Optional["Room"]] = relationship(back_populates="bookings")

    __table_args__ = (
        CheckConstraint("check_out > check_in", name="ck_bookings_dates"),
        Index("ix_bookings_type_dates", "room_type", "check_in", "check_out"),
    )


def init_db() -> None:
    """Create tables and seed a starting inventory of rooms."""
    # ensure the data dir exists (SQLite won't create parent dirs)
    if config.database_url.startswith("sqlite:///"):
        Path(config.database_url.removeprefix("sqlite:///")).parent.mkdir(
            parents=True, exist_ok=True
        )
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(Room)) == 0:
            rooms = [
                Room(room_number=f"D{n:03d}", room_type="deluxe", floor=1 + (n - 1) // 20)
                for n in range(1, ROOM_TYPES["deluxe"]["total_rooms"] + 1)
            ] + [
                Room(room_number=f"E{n:03d}", room_type="executive", floor=4 + (n - 1) // 6)
                for n in range(1, ROOM_TYPES["executive"]["total_rooms"] + 1)
            ]
            db.add_all(rooms)
            db.commit()


def _parse_date(v: str | date) -> date:
    if isinstance(v, date):
        return v
    try:
        return date.fromisoformat(str(v).strip())
    except ValueError as e:
        raise ValueError(f"Invalid date '{v}'. Use YYYY-MM-DD.") from e


def _nights(check_in: date, check_out: date) -> int:
    n = (check_out - check_in).days
    if n < 1:
        raise ValueError(f"check_out must be after check_in (got {n} nights).")
    return n


# ────────────────────────────── TOOL EXECUTORS ──────────────────────────────
def check_room_availability(
    room_type: str, check_in: str, check_out: str, guests: int = 2
) -> dict:
    """LLM tool: availability + quote for the stay."""
    rt = str(room_type).lower().strip()
    if rt not in ROOM_TYPES:
        return {"error": f"Unknown room type '{room_type}'. Use 'deluxe' or 'executive'."}
    try:
        ci, co = _parse_date(check_in), _parse_date(check_out)
        nights = _nights(ci, co)
    except ValueError as e:
        return {"error": str(e)}

    if guests < 1:
        guests = 1
    max_g = ROOM_TYPES[rt]["max_guests"]
    guest_limit_note = None
    if guests > max_g:
        guest_limit_note = f"{ROOM_TYPES[rt]['label']} takes max {max_g} guests; extra bed on request."

    with SessionLocal() as db:
        booked = db.execute(
            select(func.count(Booking.id)).where(
                Booking.room_type == rt,
                Booking.status == "confirmed",
                Booking.check_in < co,
                Booking.check_out > ci,
            )
        ).scalar_one()
        total = db.execute(
            select(func.count(Room.id)).where(Room.room_type == rt, Room.is_active.is_(True))
        ).scalar_one()

    free = max(total - booked, 0)
    tariff = ROOM_TYPES[rt]["price_per_night"] * nights
    gst = tariff * GST_RATE

    return {
        "room_type": rt,
        "room_label": ROOM_TYPES[rt]["label"],
        "check_in": ci.isoformat(),
        "check_out": co.isoformat(),
        "nights": nights,
        "available": free > 0,
        "rooms_available": free,
        "price_per_night": ROOM_TYPES[rt]["price_per_night"],
        "tariff": round(tariff, 2),
        "gst_12_percent": round(gst, 2),
        "total_payable": round(tariff + gst, 2),
        "guests": guests,
        "guest_limit_note": guest_limit_note,
    }


def create_hotel_booking(
    room_type: str,
    check_in: str,
    check_out: str,
    guest_name: str,
    phone: str,
    guests: int = 2,
    email: str | None = None,
    special_requests: str | None = None,
) -> dict:
    """LLM tool: create + persist a confirmed booking."""
    rt = str(room_type).lower().strip()
    if rt not in ROOM_TYPES:
        return {"error": f"Unknown room type '{room_type}'. Use 'deluxe' or 'executive'."}
    name = str(guest_name).strip()
    digits = "".join(c for c in str(phone) if c.isdigit())
    if len(name) < 2:
        return {"error": "Guest name missing or too short. Ask the guest for their full name."}
    if len(digits) != 10:
        return {"error": "Phone must be a 10-digit Indian mobile number (e.g. 9876543210)."}

    try:
        ci, co = _parse_date(check_in), _parse_date(check_out)
        nights = _nights(ci, co)
    except ValueError as e:
        return {"error": str(e)}

    # Never overbook: re-check availability inside the same DB session.
    with SessionLocal() as db:
        booked = db.execute(
            select(func.count(Booking.id)).where(
                Booking.room_type == rt,
                Booking.status == "confirmed",
                Booking.check_in < co,
                Booking.check_out > ci,
            )
        ).scalar_one()
        total = db.execute(
            select(func.count(Room.id)).where(Room.room_type == rt, Room.is_active.is_(True))
        ).scalar_one()
        if total - booked < 1:
            return {
                "error": "No rooms of this type are available for those dates anymore. Offer other dates or the other room type."
            }

        # Guest upsert by phone
        guest = db.execute(select(Guest).where(Guest.phone == digits)).scalar_one_or_none()
        if guest is None:
            guest = Guest(name=name, phone=digits, email=email)
            db.add(guest)
            db.flush()
        else:
            if name and name != guest.name:
                guest.name = name  # keep freshest name
            if email:
                guest.email = email

        # Assign the lowest-numbered free room for those dates
        room = db.execute(
            select(Room)
            .where(
                Room.room_type == rt,
                Room.is_active.is_(True),
                Room.id.notin_(
                    select(Booking.room_id).where(
                        Booking.room_id.is_not(None),
                        Booking.status == "confirmed",
                        Booking.check_in < co,
                        Booking.check_out > ci,
                    )
                ),
            )
            .order_by(Room.room_number)
            .limit(1)
        ).scalar_one_or_none()

        tariff = ROOM_TYPES[rt]["price_per_night"] * nights
        gst = tariff * GST_RATE
        ref = f"GH{ci.strftime('%y%m')}{digits[-4:]}{datetime.now(tz=timezone.utc).strftime('%H%M%S')[-4:]}"
        booking = Booking(
            booking_ref=ref,
            guest_id=guest.id,
            room_id=room.id if room else None,
            room_type=rt,
            check_in=ci,
            check_out=co,
            guests=guests if 1 <= guests <= 10 else 2,
            price_per_night=ROOM_TYPES[rt]["price_per_night"],
            total_amount=round(tariff + gst, 2),
            gst_amount=round(gst, 2),
            status="confirmed",
            special_requests=special_requests,
        )
        db.add(booking)
        try:
            db.commit()
        except SQLAlchemyError as e:
            db.rollback()
            return {"error": f"Database error while saving booking: {e.__class__.__name__}"}

    return {
        "booking_id": booking.booking_ref,
        "status": "confirmed",
        "room_type": rt,
        "room_label": ROOM_TYPES[rt]["label"],
        "room_number": room.room_number if room else None,
        "check_in": ci.isoformat(),
        "check_out": co.isoformat(),
        "nights": nights,
        "guest_name": guest.name,
        "phone": guest.phone,
        "price_per_night": ROOM_TYPES[rt]["price_per_night"],
        "tariff": round(tariff, 2),
        "gst_12_percent": round(gst, 2),
        "total_payable": round(tariff + gst, 2),
        "special_requests": special_requests,
        "payment_note": "No advance needed — pay at the hotel.",
    }
