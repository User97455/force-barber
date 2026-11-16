import asyncio
import os
import uvicorn
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler

load_dotenv()

from main import app
from bot import get_bot, get_dispatcher, check_and_send_hourly_reminders

async def start_services():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(check_and_send_hourly_reminders, "interval", seconds=60)
    scheduler.start()
    print("[Scheduler] Started hourly appointment reminder job (interval 60s).")

    bot = get_bot()
    bot_task = None
    if bot:
        dp = get_dispatcher()
        print("[Bot] BOT_TOKEN found. Starting aiogram polling...")
        bot_task = asyncio.create_task(dp.start_polling(bot))
    else:
        print("[Bot] WARNING: BOT_TOKEN not configured yet. Bot polling skipped.")

    port = int(os.getenv("PORT", 8000))
    config = uvicorn.Config(app=app, host="0.0.0.0", port=port, log_level="info")
    server = uvicorn.Server(config)
    
    try:
        await server.serve()
    finally:
        scheduler.shutdown()
        if bot and bot_task:
            bot_task.cancel()
            await bot.session.close()

if __name__ == "__main__":
    asyncio.run(start_services())
