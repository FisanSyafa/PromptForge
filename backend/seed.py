import asyncio
from sqlalchemy.future import select
from app.database import AsyncSessionLocal, engine, Base
from app.models import APIEndpoint, APILog

async def seed_db():
    """Seeds the database with initial examples if not already present."""
    async with AsyncSessionLocal() as session:
        # Check if endpoints already exist
        result = await session.execute(select(APIEndpoint))
        if result.scalars().first():
            print("Database already seeded. Skipping...")
            return

        # 1. GET data API Logs
        session.add(APIEndpoint(
            name="Generator SQL - GET API Logs",
            route_name="sql-get-logs",
            http_method="GET",
            prompt_template="Anda adalah AI asisten database. Buatkan query SQL SELECT dari tabel `api_logs` berdasarkan permintaan berikut:\n\nPermintaan: {permintaan}\n\nSkema tabel `api_logs`:\n- id (int, primary key)\n- endpoint_id (int, foreign key)\n- request_payload (json)\n- response_payload (text)\n- tokens_used (int)\n- response_time_ms (float)\n- cost (float)\n- created_at (timestamp)\n\nBalas HANYA dengan kode SQL murni, tanpa markdown dan tanpa penjelasan apapun."
        ))
        
        # 2. PATCH data prompt_template
        session.add(APIEndpoint(
            name="Generator SQL - PATCH Template API",
            route_name="sql-patch-template",
            http_method="PATCH",
            prompt_template="Anda adalah AI asisten database. Buatkan query SQL UPDATE untuk mengubah kolom `prompt_template` pada tabel `api_endpoints` berdasarkan nama API.\n\nNama API target: {api_name}\nTemplate baru: {new_template}\n\nSkema tabel `api_endpoints`:\n- id (int, primary key)\n- name (varchar)\n- route_name (varchar)\n- prompt_template (text)\n\nBalas HANYA dengan kode SQL murni, tanpa markdown dan tanpa penjelasan apapun."
        ))
            
        await session.commit()
        print("Database berhasil di-seed dengan 2 contoh API SQL Generator.")

if __name__ == "__main__":
    async def run_reset_and_seed():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        await seed_db()
    
    asyncio.run(run_reset_and_seed())
