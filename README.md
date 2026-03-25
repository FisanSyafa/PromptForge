# PromptForge - AI API Builder CMS

Melalui CMS ini, admin dapat membuat API baru dengan menentukan route endpoint, model AI yang digunakan, dan prompt template sebagai logic utama API.

## Langkah-langkah Instalasi & Menjalankan Project

### 1. Persiapan Database (PostgreSQL)
Pastikan Docker sudah terinstal, lalu jalankan perintah berikut di root folder project untuk menjalankan database PostgreSQL:
```bash
docker-compose up -d
```

### 2. Konfigurasi & Menjalankan Backend (Python/FastAPI)
Buka terminal baru di folder `backend`:

1.  **Buat Virtual Environment**:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate  # Windows
    source venv/bin/activate # Linux/Mac
    ```
2.  **Instal Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Konfigurasi Environment**:
    Buat file `.env` di folder `backend` dan isi dengan:
    ```env
    DATABASE_URL=postgresql+asyncpg://promptforge:berijalan@localhost:5433/promptforge_db
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY
    OLLAMA_URL=http://localhost:11434

    POSTGRES_USER=your_username
    POSTGRES_PASSWORD=your_password
    POSTGRES_DB=your_db
    POSTGRES_PORT=your_port
    ```
4.  **Jalankan Backend**:
    ```bash
    uvicorn app.main:app --reload --port 8000
    ```
    *Catatan: Saat backend pertama kali dijalankan, sistem akan otomatis melakukan migrasi database dan melakukan **seed** data contoh (GET Logs & PATCH Template).*

### 3. Konfigurasi & Menjalankan Frontend (React/Vite)
Buka terminal baru di folder `frontend`:

1.  **Instal Dependencies**:
    ```bash
    npm install
    ```
2.  **Jalankan Frontend**:
    ```bash
    npm run dev
    ```
    Aplikasi dapat diakses di `http://localhost:5173`.

---

## Fitur Utama
- **Dashboard**: Memantau total API, jumlah pemanggilan, penggunaan token, dan estimasi biaya (termasuk biaya saat proses generate API).
- **Buat API (AI-First)**: Membuat API hanya dengan deskripsi teks. AI akan merancang route, method, dan prompt logic-nya secara otomatis.
- **Dukungan Multi-Model**: Mendukung Google Gemini dan local Ollama (Llama 3.1) untuk proses perancangan API.
- **Konsol Uji API**: Menguji endpoint yang sudah dibuat secara langsung dengan parameter input yang dinamis sesuai template.
- **SQL Execution Engine**: Mendukung eksekusi SQL langsung ke database melalui AI (untuk endpoint tipe GET/PATCH/PUT/DELETE).
