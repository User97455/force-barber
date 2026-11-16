import os
import datetime
from typing import Optional
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, MenuButtonWebApp
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from sqlalchemy import func

from database import SessionLocal, Barber, Service, Booking

_dp: Optional[Dispatcher] = None

def get_dispatcher() -> Dispatcher:
    global _dp
    if _dp is None:
        _dp = Dispatcher()
        _register_handlers(_dp)
    return _dp

def _register_handlers(dp: Dispatcher):
    dp.message.register(cmd_start, CommandStart())
    dp.message.register(cmd_myid, Command("myid"))
    dp.message.register(cmd_stats, Command("stats"))
    dp.message.register(cmd_set_barber, Command("set_barber"))


def get_bot() -> Optional[Bot]:
    token = os.getenv("BOT_TOKEN", "").strip()
    if not token:
        return None
    return Bot(token=token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))

def format_dt(dt: datetime.datetime) -> str:
    months = [
        "января", "февраля", "марта", "апреля", "мая", "июня",
        "июля", "августа", "сентября", "октября", "ноября", "декабря"
    ]
    return f"{dt.day} {months[dt.month - 1]} в {dt.strftime('%H:%M')}"

async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    admin_id_str = os.getenv("ADMIN_CHAT_ID", "").strip()

    # Auto-bind first user as Admin and Barber 1 if not set
    if not admin_id_str or admin_id_str == "":
        os.environ["ADMIN_CHAT_ID"] = str(user_id)
        # Update .env
        env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            with open(env_path, "w", encoding="utf-8") as f:
                for line in lines:
                    if line.startswith("ADMIN_CHAT_ID="):
                        f.write(f"ADMIN_CHAT_ID={user_id}\n")
                    else:
                        f.write(line)
        except Exception as e:
            print(f"[Bot] Error updating .env: {e}")

        # Update Barber 1 in DB
        db = SessionLocal()
        try:
            b1 = db.query(Barber).first()
            if b1:
                b1.telegram_id = user_id
                db.commit()
                print(f"[Bot] Assigned Barber 1 ({b1.name}) to Telegram ID {user_id}")
        finally:
            db.close()

    admin_id_str = os.getenv("ADMIN_CHAT_ID", "").strip()
    is_admin = admin_id_str and str(user_id) == admin_id_str

    webapp_url = os.getenv("WEBAPP_URL", "").strip()
    kb = None
    if webapp_url:
        kb = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="💈 Открыть барбершоп (Онлайн-запись)",
                        web_app=WebAppInfo(url=webapp_url),
                    )
                ]
            ]
        )

    greeting_text = (
        f"👋 Здравствуйте, <b>{message.from_user.first_name}</b>!\n\n"
        "Добро пожаловать в мужскую парикмахерскую <b>BORODA & CO</b>.\n\n"
        + ("👑 <b>Вы авторизованы как Администратор и Мастер #1!</b>\n"
           "Вам открыт доступ к закрытой вкладке «Финансы» в приложении, команде /stats и уведомлениям о записях.\n\n" if is_admin else "")
        + "В нашем приложении вы можете:\n"
        "✂️ Выбрать лучшего мастера и удобное время\n"
        "📅 Записаться онлайн за пару кликов\n"
        "📋 Управлять своими активными визитами\n"
        "💰 Следить за актуальными ценами и акциями\n\n"
        "Нажмите кнопку ниже, чтобы открыть приложение 👇"
    )
    await message.answer(greeting_text, reply_markup=kb)

async def cmd_myid(message: types.Message):
    user_id = message.from_user.id
    admin_id_str = os.getenv("ADMIN_CHAT_ID", "").strip()
    is_admin = admin_id_str and str(user_id) == admin_id_str
    role_note = " <i>(Администратор)</i>" if is_admin else ""
    await message.answer(
        f"Ваш Telegram ID: <code>{user_id}</code>{role_note}\n\n"
        "Используйте этот ID для настройки прав мастера или администратора."
    )

async def cmd_stats(message: types.Message):
    admin_id_str = os.getenv("ADMIN_CHAT_ID", "").strip()
    if not admin_id_str or str(message.from_user.id) != admin_id_str:
        await message.answer("⛔ Доступ запрещен. Эта команда доступна только администратору.")
        return

    db = SessionLocal()
    try:
        now = datetime.datetime.now()
        start_of_today = datetime.datetime(now.year, now.month, now.day, 0, 0, 0)
        start_of_month = datetime.datetime(now.year, now.month, 1, 0, 0, 0)

        # Non-cancelled statuses
        valid_statuses = ["active", "completed"]

        # Today stats
        today_bookings = (
            db.query(Booking)
            .filter(Booking.status.in_(valid_statuses))
            .filter(Booking.booking_datetime >= start_of_today)
            .all()
        )
        today_revenue = sum(b.price_at_booking for b in today_bookings)

        # Month stats
        month_bookings = (
            db.query(Booking)
            .filter(Booking.status.in_(valid_statuses))
            .filter(Booking.booking_datetime >= start_of_month)
            .all()
        )
        month_revenue = sum(b.price_at_booking for b in month_bookings)

        # All time stats
        all_bookings = (
            db.query(Booking)
            .filter(Booking.status.in_(valid_statuses))
            .all()
        )
        all_revenue = sum(b.price_at_booking for b in all_bookings)

        # Per barber breakdown (all time / current month)
        barbers = db.query(Barber).all()
        barber_stats = []
        for barber in barbers:
            b_month_bookings = [b for b in month_bookings if b.barber_id == barber.id]
            b_rev = sum(b.price_at_booking for b in b_month_bookings)
            barber_stats.append(f"• <b>{barber.name}</b>: {b_rev:,} ₽ <i>({len(b_month_bookings)} записей)</i>".replace(",", " "))

        stats_msg = (
            "📊 <b>Финансовая аналитика барбершопа</b>\n\n"
            f"📅 <b>За сегодня:</b> {today_revenue:,} ₽ <i>({len(today_bookings)} записей)</i>\n"
            f"🗓 <b>За этот месяц:</b> {month_revenue:,} ₽ <i>({len(month_bookings)} записей)</i>\n"
            f"💼 <b>За всё время:</b> {all_revenue:,} ₽ <i>({len(all_bookings)} записей)</i>\n\n"
            "💈 <b>Выручка по мастерам за этот месяц:</b>\n" +
            ("\n".join(barber_stats) if barber_stats else "— пока нет данных")
        ).replace(",", " ")

        await message.answer(stats_msg)
    finally:
        db.close()

async def cmd_set_barber(message: types.Message):
    parts = message.text.strip().split()
    if len(parts) < 3:
        await message.answer(
            "Формат команды: <code>/set_barber &lt;barber_id&gt; &lt;telegram_id&gt; [ADMIN_SECRET]</code>\n"
            "Пример: <code>/set_barber 1 123456789</code>"
        )
        return

    barber_id_str = parts[1]
    target_tg_id_str = parts[2]
    secret = parts[3] if len(parts) > 3 else ""

    admin_secret = os.getenv("ADMIN_SECRET", "supersecretadmin123").strip()
    admin_id_str = os.getenv("ADMIN_CHAT_ID", "").strip()

    is_authorized = (
        (admin_id_str and str(message.from_user.id) == admin_id_str) or
        (secret and secret == admin_secret)
    )

    if not is_authorized:
        await message.answer("⛔ Неверный ADMIN_SECRET или вы не являетесь администратором.")
        return

    try:
        barber_id = int(barber_id_str)
        target_tg_id = int(target_tg_id_str)
    except ValueError:
        await message.answer("❌ ID мастера и Telegram ID должны быть числами.")
        return

    db = SessionLocal()
    try:
        barber = db.query(Barber).filter(Barber.id == barber_id).first()
        if not barber:
            await message.answer(f"❌ Мастер с ID {barber_id} не найден.")
            return

        barber.telegram_id = target_tg_id
        db.commit()
        await message.answer(
            f"✅ Мастер <b>{barber.name}</b> (ID {barber.id}) успешно привязан к Telegram ID: <code>{target_tg_id}</code>!\n"
            "Теперь мастер будет получать персональные уведомления о новых записях и напоминания."
        )
    finally:
        db.close()

# Notification Helpers
async def send_new_booking_notifications(booking_id: int):
    bot = get_bot()
    if not bot:
        return

    db = SessionLocal()
    try:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            return

        barber = booking.barber
        service = booking.service
        admin_id_str = os.getenv("ADMIN_CHAT_ID", "").strip()
        admin_id = int(admin_id_str) if admin_id_str and admin_id_str.isdigit() else None
        dt_str = format_dt(booking.booking_datetime)

        # 1. Notify Client (if telegram_id is available)
        if booking.client_telegram_id:
            client_text = (
                "✅ <b>Ваша запись успешно подтверждена!</b>\n\n"
                f"💈 <b>Мастер:</b> {barber.name}\n"
                f"✂️ <b>Услуга:</b> {service.title}\n"
                f"💰 <b>Стоимость:</b> {booking.price_at_booking} ₽\n"
                f"📅 <b>Дата и время:</b> {dt_str}\n\n"
                "📍 Ждём вас по адресу: ул. Новый Арбат, 21\n"
                "<i>Управлять записью можно в любое время во вкладке «Мои записи».</i>"
            )
            try:
                await bot.send_message(chat_id=booking.client_telegram_id, text=client_text)
            except Exception as e:
                print(f"[Bot] Failed to send client notification: {e}")

        # 2. Notify Barber (or Admin fallback)
        clean_phone = booking.client_phone.replace(" ", "").replace("(", "").replace(")", "").replace("-", "")
        barber_text = (
            "🔔 <b>Новая запись к вам!</b>\n\n"
            f"👤 <b>Клиент:</b> {booking.client_name}\n"
            f"📞 <b>Телефон:</b> <a href='tel:{clean_phone}'>{booking.client_phone}</a>\n"
            f"✂️ <b>Услуга:</b> {service.title} ({service.duration_minutes} мин)\n"
            f"💰 <b>Сумма:</b> {booking.price_at_booking} ₽\n"
            f"📅 <b>Дата и время:</b> {dt_str}"
        )

        recipient_id = barber.telegram_id if barber.telegram_id else admin_id
        if recipient_id:
            try:
                await bot.send_message(chat_id=recipient_id, text=barber_text)
            except Exception as e:
                print(f"[Bot] Failed to send barber notification: {e}")
    finally:
        db.close()
        await bot.session.close()

async def send_cancellation_notifications(booking_id: int):
    bot = get_bot()
    if not bot:
        return

    db = SessionLocal()
    try:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            return

        barber = booking.barber
        service = booking.service
        admin_id_str = os.getenv("ADMIN_CHAT_ID", "").strip()
        admin_id = int(admin_id_str) if admin_id_str and admin_id_str.isdigit() else None
        dt_str = format_dt(booking.booking_datetime)

        # Notify Barber / Admin
        barber_text = (
            "⚠️ <b>Запись отменена клиентом!</b>\n\n"
            f"👤 <b>Клиент:</b> {booking.client_name}\n"
            f"✂️ <b>Услуга:</b> {service.title}\n"
            f"📅 <b>Было запланировано:</b> {dt_str}\n\n"
            "<i>Слот снова свободен для бронирования другими клиентами.</i>"
        )
        recipient_id = barber.telegram_id if barber.telegram_id else admin_id
        if recipient_id:
            try:
                await bot.send_message(chat_id=recipient_id, text=barber_text)
            except Exception as e:
                print(f"[Bot] Failed to send cancellation notice to barber: {e}")

        # Notify Client
        if booking.client_telegram_id:
            client_text = (
                "❌ <b>Ваша запись отменена.</b>\n\n"
                f"💈 <b>Мастер:</b> {barber.name}\n"
                f"✂️ <b>Услуга:</b> {service.title}\n"
                f"📅 <b>Время:</b> {dt_str}\n\n"
                "Будем рады видеть вас в другой удобный день!"
            )
            try:
                await bot.send_message(chat_id=booking.client_telegram_id, text=client_text)
            except Exception as e:
                print(f"[Bot] Failed to send cancellation notice to client: {e}")
    finally:
        db.close()
        await bot.session.close()

async def check_and_send_hourly_reminders():
    bot = get_bot()
    if not bot:
        return

    db = SessionLocal()
    try:
        now = datetime.datetime.now()
        # Look for bookings scheduled between 50 and 70 minutes from now
        window_start = now + datetime.timedelta(minutes=50)
        window_end = now + datetime.timedelta(minutes=70)

        upcoming_bookings = (
            db.query(Booking)
            .filter(Booking.status == "active")
            .filter(Booking.reminded == False)
            .filter(Booking.booking_datetime >= window_start)
            .filter(Booking.booking_datetime <= window_end)
            .all()
        )

        admin_id_str = os.getenv("ADMIN_CHAT_ID", "").strip()
        admin_id = int(admin_id_str) if admin_id_str and admin_id_str.isdigit() else None

        for b in upcoming_bookings:
            dt_str = format_dt(b.booking_datetime)
            barber = b.barber
            service = b.service

            # Client reminder
            if b.client_telegram_id:
                client_text = (
                    "⏰ <b>Напоминание о визите через 1 час!</b>\n\n"
                    f"💈 <b>Мастер:</b> {barber.name}\n"
                    f"✂️ <b>Услуга:</b> {service.title}\n"
                    f"📅 <b>Время:</b> {dt_str}\n"
                    "📍 Адрес: ул. Новый Арбат, 21\n\n"
                    "Ждём вас!"
                )
                try:
                    await bot.send_message(chat_id=b.client_telegram_id, text=client_text)
                except Exception as e:
                    print(f"[Reminder] Client error: {e}")

            # Barber reminder
            clean_phone = b.client_phone.replace(" ", "").replace("(", "").replace(")", "").replace("-", "")
            barber_text = (
                "⏰ <b>Напоминание: визит через 1 час!</b>\n\n"
                f"👤 <b>Клиент:</b> {b.client_name}\n"
                f"📞 <b>Телефон:</b> <a href='tel:{clean_phone}'>{b.client_phone}</a>\n"
                f"✂️ <b>Услуга:</b> {service.title}\n"
                f"📅 <b>Время:</b> {dt_str}"
            )
            recipient_id = barber.telegram_id if barber.telegram_id else admin_id
            if recipient_id:
                try:
                    await bot.send_message(chat_id=recipient_id, text=barber_text)
                except Exception as e:
                    print(f"[Reminder] Barber error: {e}")

            b.reminded = True
            db.commit()
    finally:
        db.close()
        await bot.session.close()
