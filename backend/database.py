import os
import datetime
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    BigInteger,
    String,
    Float,
    DateTime,
    Boolean,
    ForeignKey,
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./barbershop.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Barber(Base):
    __tablename__ = "barbers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    specialization = Column(String, nullable=False)
    rating = Column(Float, default=5.0)
    photo_url = Column(String, nullable=True)
    telegram_id = Column(BigInteger, nullable=True)

    bookings = relationship("Booking", back_populates="barber")


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    price = Column(Integer, nullable=False)
    duration_minutes = Column(Integer, default=60)

    bookings = relationship("Booking", back_populates="service")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    price_at_booking = Column(Integer, nullable=False)
    client_telegram_id = Column(BigInteger, nullable=True)
    client_name = Column(String, nullable=False)
    client_phone = Column(String, nullable=False)
    booking_datetime = Column(DateTime, nullable=False)
    status = Column(String, default="active")  # 'active', 'completed', 'cancelled'
    reminded = Column(Boolean, default=False)

    barber = relationship("Barber", back_populates="bookings")
    service = relationship("Service", back_populates="bookings")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_initial_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Barber).count() == 0:
            barbers = [
                Barber(
                    name="Алексей Смирнов",
                    specialization="Топ-барбер • Классические стрижки и борода",
                    rating=4.98,
                    photo_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
                    telegram_id=None,
                ),
                Barber(
                    name="Дмитрий Волков",
                    specialization="Шеф-барбер • Сложные фейды и стилизации",
                    rating=4.95,
                    photo_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
                    telegram_id=None,
                ),
                Barber(
                    name="Артур Багдасарян",
                    specialization="Мастер • Моделирование бороды и камуфляж",
                    rating=4.92,
                    photo_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
                    telegram_id=None,
                ),
                Barber(
                    name="Максим Орлов",
                    specialization="Барбер • Современные тренды и груминг",
                    rating=4.89,
                    photo_url="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
                    telegram_id=None,
                ),
            ]
            db.add_all(barbers)
            db.commit()

            services = [
                Service(title="Мужская стрижка", price=1800, duration_minutes=60),
                Service(
                    title="Стрижка + Моделирование бороды",
                    price=2600,
                    duration_minutes=60,
                ),
                Service(
                    title="Моделирование бороды",
                    price=1200,
                    duration_minutes=45,
                ),
                Service(
                    title="Королевское бритьё",
                    price=1600,
                    duration_minutes=45,
                ),
                Service(
                    title="Премиум комплекс (Стрижка, борода, уход)",
                    price=3500,
                    duration_minutes=90,
                ),
                Service(
                    title="Детская стрижка (до 12 лет)",
                    price=1400,
                    duration_minutes=45,
                ),
            ]
            db.add_all(services)
            db.commit()

            # Seed demo bookings to showcase financial stats immediately
            now = datetime.datetime.now().replace(minute=0, second=0, microsecond=0)
            yesterday = now - datetime.timedelta(days=1)
            two_days_ago = now - datetime.timedelta(days=2)

            b1 = barbers[0]
            b2 = barbers[1]
            b3 = barbers[2]
            b4 = barbers[3]

            s1 = services[0]  # 1800
            s2 = services[1]  # 2600
            s3 = services[2]  # 1200
            s5 = services[4]  # 3500

            demo_bookings = [
                # 2 days ago (completed)
                Booking(
                    barber_id=b1.id,
                    service_id=s2.id,
                    price_at_booking=s2.price,
                    client_telegram_id=111111,
                    client_name="Михаил К.",
                    client_phone="+7 (999) 111-22-33",
                    booking_datetime=two_days_ago.replace(hour=11),
                    status="completed",
                    reminded=True,
                ),
                Booking(
                    barber_id=b2.id,
                    service_id=s5.id,
                    price_at_booking=s5.price,
                    client_telegram_id=222222,
                    client_name="Сергей П.",
                    client_phone="+7 (999) 222-33-44",
                    booking_datetime=two_days_ago.replace(hour=14),
                    status="completed",
                    reminded=True,
                ),
                # Yesterday (completed)
                Booking(
                    barber_id=b1.id,
                    service_id=s1.id,
                    price_at_booking=s1.price,
                    client_telegram_id=333333,
                    client_name="Константин В.",
                    client_phone="+7 (999) 333-44-55",
                    booking_datetime=yesterday.replace(hour=12),
                    status="completed",
                    reminded=True,
                ),
                Booking(
                    barber_id=b3.id,
                    service_id=s3.id,
                    price_at_booking=s3.price,
                    client_telegram_id=444444,
                    client_name="Денис С.",
                    client_phone="+7 (999) 444-55-66",
                    booking_datetime=yesterday.replace(hour=16),
                    status="completed",
                    reminded=True,
                ),
                # Today (completed earlier)
                Booking(
                    barber_id=b2.id,
                    service_id=s1.id,
                    price_at_booking=s1.price,
                    client_telegram_id=555555,
                    client_name="Иван Т.",
                    client_phone="+7 (999) 555-66-77",
                    booking_datetime=now.replace(hour=10),
                    status="completed",
                    reminded=True,
                ),
                # Today (active later)
                Booking(
                    barber_id=b1.id,
                    service_id=s2.id,
                    price_at_booking=s2.price,
                    client_telegram_id=666666,
                    client_name="Павел Д.",
                    client_phone="+7 (999) 777-88-99",
                    booking_datetime=now.replace(hour=17),
                    status="active",
                    reminded=False,
                ),
                Booking(
                    barber_id=b4.id,
                    service_id=s1.id,
                    price_at_booking=s1.price,
                    client_telegram_id=777777,
                    client_name="Владимир Я.",
                    client_phone="+7 (999) 888-99-00",
                    booking_datetime=now.replace(hour=18),
                    status="active",
                    reminded=False,
                ),
            ]
            db.add_all(demo_bookings)
            db.commit()
    finally:
        db.close()
