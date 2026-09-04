import sqlite3
conn = sqlite3.connect('taskpath.db')
conn.execute("UPDATE users SET email = 'admin@admin.com' WHERE username = 'admin'")
conn.commit()
conn.close()
print("Updated admin email to admin@admin.com")
