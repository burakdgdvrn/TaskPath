import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# In a real app, generate this once and save it in .env: 
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
SECRET_KEY = os.getenv("CHAT_SECRET_KEY")

if not SECRET_KEY:
    # Fallback for development if not provided
    # Do NOT use a hardcoded key in production!
    SECRET_KEY = b"f_aR4s2O_QZ5Uq8h7K7tL8O1Tz2uB5aJ9hT5sN7qE1I=".decode()

fernet = Fernet(SECRET_KEY.encode())

def encrypt_message(plain_text: str) -> str:
    """Encrypts a string and returns the encrypted string."""
    if not plain_text:
        return ""
    encrypted_bytes = fernet.encrypt(plain_text.encode("utf-8"))
    return encrypted_bytes.decode("utf-8")

def decrypt_message(encrypted_text: str) -> str:
    """Decrypts a string and returns the plain text."""
    if not encrypted_text:
        return ""
    try:
        decrypted_bytes = fernet.decrypt(encrypted_text.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except Exception as e:
        print(f"Decryption failed: {e}")
        return "[Mesaj Şifresi Çözülemedi]"
