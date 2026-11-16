import datetime
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db, seed_initial_data, Barber, Service, Booking
from auth import get_current_user, require_admin, get_admin_chat_id, validate_telegram_init_data
from fastapi import Header
from bot import (
    send_new_booking_notifications,
    send_cancellation_notifications,
)

app = FastAPI(title="Barbershop Mini App API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    seed_initial_data()

# Schemas
class CreateBookingRequest(BaseModel):
    barber_id: int
    service_id: int
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    client_name: str
    client_phone: str
    client_telegram_id: Optional[int] = None

class UpdateBookingStatusRequest(BaseModel):
    status: str  # 'active', 'completed', 'cancelled'

# Public Endpoints
@app.get("/api/barbers")
def get_barbers(db: Session = Depends(get_db)):
    barbers = db.query(Barber).all()
    return [
        {
            "id": b.id,
            "name": b.name,
            "specialization": b.specialization,
            "rating": b.rating,
            "photo_url": b.photo_url,
            "telegram_id": b.telegram_id,
        }
        for b in barbers
    ]

@app.get("/api/services")
def get_services(db: Session = Depends(get_db)):
    services = db.query(Service).all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "price": s.price,
            "duration_minutes": s.duration_minutes,
        }
        for s in services
    ]

@app.get("/api/slots")
def get_available_slots(
    barber_id: int = Query(...),
    date: str = Query(...),  # YYYY-MM-DD
    db: Session = Depends(get_db),
):
    try:
        query_date = datetime.datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD")

    # Time slots from 10:00 to 20:00 hourly
    all_slots = [f"{hour:02d}:00" for hour in range(10, 21)]

    # Fetch active bookings for this barber on this date
    start_of_day = datetime.datetime.combine(query_date, datetime.time.min)
    end_of_day = datetime.datetime.combine(query_date, datetime.time.max)

    bookings = (
        db.query(Booking)
        .filter(Booking.barber_id == barber_id)
        .filter(Booking.status.in_(["active", "completed"]))
        .filter(Booking.booking_datetime >= start_of_day)
        .filter(Booking.booking_datetime <= end_of_day)
        .all()
    )

    booked_hours = {b.booking_datetime.strftime("%H:%M") for b in bookings}

    now = datetime.datetime.now()
    result = []
    for slot in all_slots:
        slot_hour, slot_min = map(int, slot.split(":"))
        slot_dt = datetime.datetime.combine(query_date, datetime.time(slot_hour, slot_min))

        # Check if already booked or in the past
        is_past = slot_dt < now
        is_booked = slot in booked_hours
        available = not is_past and not is_booked

        result.append({
            "time": slot,
            "available": available,
            "reason": "past" if is_past else ("booked" if is_booked else None),
        })

    return result

@app.post("/api/bookings")
async def create_booking(
    req: CreateBookingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    x_telegram_init_data: Optional[str] = Header(None, alias="X-Telegram-Init-Data"),
):
    client_tg_id = req.client_telegram_id
    if x_telegram_init_data:
        try:
            tg_user = validate_telegram_init_data(x_telegram_init_data)
            if tg_user and "id" in tg_user:
                client_tg_id = tg_user["id"]
        except Exception as e:
            print(f"[API] Warning: could not validate initData on booking: {e}")

    try:
        booking_datetime = datetime.datetime.strptime(f"{req.date} {req.time}", "%Y-%m-%d %H:%M")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date or time format")

    if booking_datetime < datetime.datetime.now():
        raise HTTPException(status_code=400, detail="Cannot book an appointment in the past")

    # Check barber and service
    barber = db.query(Barber).filter(Barber.id == req.barber_id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")

    service = db.query(Service).filter(Service.id == req.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Check slot collision
    existing = (
        db.query(Booking)
        .filter(Booking.barber_id == req.barber_id)
        .filter(Booking.booking_datetime == booking_datetime)
        .filter(Booking.status.in_(["active", "completed"]))
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="This time slot is already booked")

    # Phone validation
    phone_clean = "".join(filter(str.isdigit, req.client_phone))
    if len(phone_clean) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    new_booking = Booking(
        barber_id=barber.id,
        service_id=service.id,
        price_at_booking=service.price,
        client_telegram_id=client_tg_id,
        client_name=req.client_name.strip(),
        client_phone=req.client_phone.strip(),
        booking_datetime=booking_datetime,
        status="active",
        reminded=False,
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    # Trigger notifications in background
    background_tasks.add_task(send_new_booking_notifications, new_booking.id)

    return {
        "id": new_booking.id,
        "barber_id": new_booking.barber_id,
        "barber_name": barber.name,
        "service_title": service.title,
        "price": new_booking.price_at_booking,
        "booking_datetime": new_booking.booking_datetime.isoformat(),
        "status": new_booking.status,
    }

# Client My Bookings & Cancel
@app.get("/api/my-bookings")
def get_my_bookings(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    user_id = user.get("id")
    bookings = (
        db.query(Booking)
        .filter(Booking.client_telegram_id == user_id)
        .order_by(Booking.booking_datetime.desc())
        .all()
    )
    return [
        {
            "id": b.id,
            "barber_id": b.barber_id,
            "barber_name": b.barber.name,
            "service_id": b.service_id,
            "service_title": b.service.title,
            "price": b.price_at_booking,
            "booking_datetime": b.booking_datetime.isoformat(),
            "status": b.status,
            "can_cancel": b.status == "active" and b.booking_datetime > datetime.datetime.now(),
        }
        for b in bookings
    ]

@app.post("/api/bookings/{booking_id}/cancel")
async def cancel_booking(
    booking_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    admin_id = get_admin_chat_id()
    is_admin = admin_id and user.get("id") == admin_id
    is_owner = booking.client_telegram_id and user.get("id") == booking.client_telegram_id

    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="You do not have permission to cancel this booking")

    if booking.status == "cancelled":
        return {"id": booking.id, "status": "cancelled", "message": "Already cancelled"}

    booking.status = "cancelled"
    db.commit()

    background_tasks.add_task(send_cancellation_notifications, booking.id)

    return {"id": booking.id, "status": "cancelled", "message": "Booking successfully cancelled"}

# Admin Role Check & Analytics
@app.get("/api/admin/check")
def check_admin_status(user: dict = Depends(get_current_user)):
    admin_id = get_admin_chat_id()
    is_admin = admin_id is not None and user.get("id") == admin_id
    return {"is_admin": is_admin, "user_id": user.get("id")}

@app.get("/api/admin/stats")
def get_admin_stats(
    period: str = Query("all", regex="^(today|month|all)$"),
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    now = datetime.datetime.now()
    valid_statuses = ["active", "completed"]

    base_query = db.query(Booking)

    if period == "today":
        start_date = datetime.datetime(now.year, now.month, now.day, 0, 0, 0)
        filtered_query = base_query.filter(Booking.booking_datetime >= start_date)
    elif period == "month":
        start_date = datetime.datetime(now.year, now.month, 1, 0, 0, 0)
        filtered_query = base_query.filter(Booking.booking_datetime >= start_date)
    else:  # all
        filtered_query = base_query

    all_period_bookings = filtered_query.all()
    revenue_bookings = [b for b in all_period_bookings if b.status in valid_statuses]

    total_revenue = sum(b.price_at_booking for b in revenue_bookings)
    active_count = sum(1 for b in all_period_bookings if b.status == "active")
    completed_count = sum(1 for b in all_period_bookings if b.status == "completed")
    cancelled_count = sum(1 for b in all_period_bookings if b.status == "cancelled")

    # Per barber stats
    barbers = db.query(Barber).all()
    barbers_stats = []
    for barber in barbers:
        b_rev_bookings = [b for b in revenue_bookings if b.barber_id == barber.id]
        b_revenue = sum(b.price_at_booking for b in b_rev_bookings)
        barbers_stats.append({
            "barber_id": barber.id,
            "barber_name": barber.name,
            "specialization": barber.specialization,
            "rating": barber.rating,
            "clients_count": len(b_rev_bookings),
            "revenue": b_revenue,
        })

    # Sort barbers by revenue desc
    barbers_stats.sort(key=lambda x: x["revenue"], reverse=True)

    return {
        "period": period,
        "total_revenue": total_revenue,
        "total_bookings_count": len(revenue_bookings),
        "active_count": active_count,
        "completed_count": completed_count,
        "cancelled_count": cancelled_count,
        "barbers_stats": barbers_stats,
    }

@app.get("/api/admin/bookings")
def get_admin_bookings(
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    bookings = db.query(Booking).order_by(Booking.booking_datetime.desc()).limit(100).all()
    return [
        {
            "id": b.id,
            "barber_id": b.barber_id,
            "barber_name": b.barber.name,
            "service_id": b.service_id,
            "service_title": b.service.title,
            "price": b.price_at_booking,
            "client_name": b.client_name,
            "client_phone": b.client_phone,
            "booking_datetime": b.booking_datetime.isoformat(),
            "status": b.status,
            "client_telegram_id": b.client_telegram_id,
        }
        for b in bookings
    ]

@app.patch("/api/admin/bookings/{booking_id}/status")
def update_admin_booking_status(
    booking_id: int,
    req: UpdateBookingStatusRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    if req.status not in ["active", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = req.status
    db.commit()
    db.refresh(booking)

    return {
        "id": booking.id,
        "status": booking.status,
        "price": booking.price_at_booking,
        "message": f"Status updated to {req.status}",
    }

# Admin Management: Services
class ServiceManageRequest(BaseModel):
    title: str
    price: int
    duration_minutes: int = 60

@app.post("/api/admin/services")
def create_service(
    req: ServiceManageRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    service = Service(
        title=req.title.strip(),
        price=req.price,
        duration_minutes=req.duration_minutes,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return {"id": service.id, "title": service.title, "price": service.price, "duration_minutes": service.duration_minutes}

@app.delete("/api/admin/services/{service_id}")
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    # Also delete or detach associated bookings if any
    db.query(Booking).filter(Booking.service_id == service_id).delete()
    db.delete(service)
    db.commit()
    return {"message": "Услуга успешно удалена"}

# Admin Management: Barbers
class BarberManageRequest(BaseModel):
    name: str
    specialization: str
    rating: float = 5.0
    photo_url: Optional[str] = None
    telegram_id: Optional[int] = None

@app.post("/api/admin/barbers")
def create_barber(
    req: BarberManageRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    barber = Barber(
        name=req.name.strip(),
        specialization=req.specialization.strip(),
        rating=req.rating,
        photo_url=req.photo_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        telegram_id=req.telegram_id,
    )
    db.add(barber)
    db.commit()
    db.refresh(barber)
    return {
        "id": barber.id,
        "name": barber.name,
        "specialization": barber.specialization,
        "rating": barber.rating,
        "photo_url": barber.photo_url,
        "telegram_id": barber.telegram_id,
    }

@app.delete("/api/admin/barbers/{barber_id}")
def delete_barber(
    barber_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    # Also delete associated bookings
    db.query(Booking).filter(Booking.barber_id == barber_id).delete()
    db.delete(barber)
    db.commit()
    return {"message": "Мастер успешно удален"}

# Admin Management: Reset Profit & Bookings
@app.post("/api/admin/reset-stats")
def reset_admin_stats(
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    deleted_count = db.query(Booking).delete()
    db.commit()
    return {"message": f"История и прибыль успешно сброшены (удалено записей: {deleted_count})"}

from fastapi.staticfiles import StaticFiles
import os

# Mount frontend build if it exists
frontend_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="frontend")

