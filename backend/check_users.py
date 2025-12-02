import sqlite3
conn = sqlite3.connect('quotation.db')
cur = conn.cursor()
cur.execute("SELECT username, role FROM users")
rows = cur.fetchall()
print("Users:", rows)
conn.close()