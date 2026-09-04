import asyncio
import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.services.auth_service import hash_password
from app.config import settings

async def migrate():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    
    async with engine.begin() as conn:
        try:
            # Add is_admin column
            await conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
            print("Successfully added is_admin column.")
        except Exception as e:
            print(f"Column might already exist or error occurred: {e}")
            
        # Check if admin user exists
        result = await conn.execute(text("SELECT id FROM users WHERE username = 'admin'"))
        admin_user = result.fetchone()
        
        if not admin_user:
            print("Creating default admin user...")
            import uuid
            admin_id = str(uuid.uuid4())
            admin_hash = hash_password("admin123")
            
            await conn.execute(
                text("""
                    INSERT INTO users (id, username, email, password_hash, display_name, is_admin, avatar_color) 
                    VALUES (:id, :username, :email, :password_hash, :display_name, :is_admin, :avatar_color)
                """),
                {
                    "id": admin_id,
                    "username": "admin",
                    "email": "admin@taskpath.local",
                    "password_hash": admin_hash,
                    "display_name": "System Admin",
                    "is_admin": 1,
                    "avatar_color": "#f43f5e"
                }
            )
            print("Admin user created! Username: admin, Password: admin123")
        else:
            print("Admin user already exists. Updating is_admin flag...")
            await conn.execute(text("UPDATE users SET is_admin = 1 WHERE username = 'admin'"))
            print("Updated admin user.")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
