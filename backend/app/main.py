import time
import os
import json
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from google import genai
import httpx

from app.database import get_db, engine, Base
from app.models import APIEndpoint, APILog
from app.schemas import APIEndpointCreate, APIEndpointResponse, APILogResponse, DashboardStats, EndpointGenerateRequest

app = FastAPI(title="PromptForge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize API Clients
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", "dummy_key"))
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Auto-seed if database is empty
    from seed import seed_db
    await seed_db()
        
@app.post("/admin/endpoints", response_model=APIEndpointResponse)
async def create_endpoint(endpoint: APIEndpointCreate, db: AsyncSession = Depends(get_db)):
    # Check if route exists
    result = await db.execute(select(APIEndpoint).where(APIEndpoint.route_name == endpoint.route_name))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Route name already exists")
    
    new_endpoint = APIEndpoint(**endpoint.dict())
    db.add(new_endpoint)
    await db.commit()
    await db.refresh(new_endpoint)
    return new_endpoint

@app.get("/admin/endpoints", response_model=list[APIEndpointResponse])
async def list_endpoints(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(APIEndpoint))
    return result.scalars().all()

@app.delete("/admin/endpoints/{endpoint_id}")
async def delete_endpoint(endpoint_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(APIEndpoint).where(APIEndpoint.id == endpoint_id))
    ep = result.scalars().first()
    if not ep:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    
    # Cascade delete logs first (if foreign key doesn't cascade automatically in SQLite/Postgres)
    await db.execute(APILog.__table__.delete().where(APILog.endpoint_id == endpoint_id))
    await db.delete(ep)
    await db.commit()
    return {"success": True}

@app.get("/admin/stats", response_model=DashboardStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    total_endpoints = await db.scalar(select(func.count(APIEndpoint.id)))
    total_calls = await db.scalar(select(func.count(APILog.id)))
    total_tokens = await db.scalar(select(func.coalesce(func.sum(APILog.tokens_used), 0)))
    total_cost = await db.scalar(select(func.coalesce(func.sum(APILog.cost), 0.0)))
    avg_time = await db.scalar(select(func.coalesce(func.avg(APILog.response_time_ms), 0.0)))
    
    return DashboardStats(
        total_endpoints=total_endpoints or 0,
        total_calls=total_calls or 0,
        total_tokens=total_tokens or 0,
        total_cost=total_cost or 0.0,
        avg_response_time_ms=avg_time or 0.0
    )

@app.get("/admin/endpoints/{endpoint_id}/logs", response_model=list[APILogResponse])
async def get_endpoint_logs(endpoint_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(APILog).where(APILog.endpoint_id == endpoint_id).order_by(APILog.created_at.desc()).limit(50))
    return result.scalars().all()

@app.post("/admin/generate-endpoint")
async def auto_generate_endpoint(req: EndpointGenerateRequest, db: AsyncSession = Depends(get_db)):
    """Generates an API Endpoint configuration using AI based on user description."""
    start_time = time.time()
    system_prompt = '''You are an expert API Architect for "PromptForge", a dynamic AI-powered API builder platform.
    The user wants to create an AI-powered API. Your job is to output a JSON object containing the optimal configuration.

    IMPORTANT LANGUAGE RULE:
    - Detect the language used by the user in their request.
    - The "prompt_template" MUST be written in the SAME language as the user's input.
    - Do NOT translate to English unless the user uses English.
    - Ensure the tone, instructions, and response format inside the prompt_template are fully consistent with the user's language.

    IMPORTANT PROMPT STYLE RULE:
    - The "prompt_template" MUST be written as an instruction (imperative sentence).
    - It must clearly command the AI what to do (e.g., "Analisis...", "Buatkan...", "Ringkas...", "Klasifikasikan...").
    - It MUST contain one or more {variables} (e.g., {teks}, {input}, {data}). WITHOUT {VARIABLES}, THE API IS USELESS.
    - Avoid descriptive or passive sentences; always use directive language that defines the AI's task explicitly.
    - If the API's purpose is to generate SQL or specific code, include instructions in the prompt_template like "Balas HANYA dengan kode murni, tanpa markdown dan tanpa penjelasan."

    The JSON must have the following keys:
    - "name": A concise, clear name for the API (use the same language as the user).
    - "route_name": A URL-friendly slug, use dashes (e.g., "sentiment", "spam-detector").
    - "http_method": Choose one of "GET", "POST", "PUT", "PATCH", "DELETE".
    - "prompt_template": The exact instruction prompt that acts as the logic of the API. It MUST contains {variables} and MUST be written as a command.

    ADDITIONAL RULES:
    - Always ensure the prompt_template includes clear output formatting instructions (e.g., bullet points, JSON, or structured text).
    - Avoid ambiguity in variables; use clear names.
    - Ensure the API is practical and usable in real-world scenarios.

    Format your entire response strictly as raw valid JSON. Do NOT output markdown code blocks wrapping the overall JSON.
    '''
    
    model_name = req.model_name or "gemini-2.5-flash"
    tokens_used = 0
    
    try:
        raw_text = ""
        if model_name.startswith("ollama") or model_name.startswith("llama"):
            # Use Ollama
            actual_model = model_name.replace("ollama:", "") if ":" in model_name else model_name
            if actual_model == "ollama": actual_model = "llama3.1"
            
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"{OLLAMA_URL}/api/generate",
                    json={
                        "model": actual_model,
                        "prompt": f"{system_prompt}\n\nUser Request: {req.description}",
                        "stream": False,
                        "format": "json"
                    },
                    timeout=60.0
                )
                if res.status_code != 200:
                    raise HTTPException(status_code=500, detail=f"Ollama Error: {res.text}")
                
                resp_json = res.json()
                raw_text = resp_json.get("response", "").strip()
                # Ollama token estimation (rough sum if not provided)
                tokens_used = resp_json.get("prompt_eval_count", 0) + resp_json.get("eval_count", 0)
        else:
            # Use Gemini
            response = gemini_client.models.generate_content(
                model=model_name if "gemini" in model_name else "gemini-2.5-flash",
                contents=[system_prompt, f"User Request: {req.description}"]
            )
            raw_text = response.text.strip()
            if hasattr(response, 'usage_metadata') and response.usage_metadata:
                tokens_used = response.usage_metadata.total_token_count
            
        elapsed_ms = (time.time() - start_time) * 1000
        cost = (tokens_used / 1000.0) * 0.0001
        
        # Log generation usage (endpoint_id=None)
        db_log = APILog(
            endpoint_id=None,
            request_payload={"action": "generate", "prompt": req.description, "model": model_name},
            response_payload=raw_text[:1000] + "...",
            tokens_used=tokens_used,
            response_time_ms=elapsed_ms,
            cost=cost
        )
        db.add(db_log)
        await db.commit()
            
        # Parse output
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:-3].strip()
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:-3].strip()
            
        return json.loads(raw_text)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Gagal generate API dengan AI: {str(e)}")

@app.get("/admin/chart-data")
async def get_chart_data(period: str = "weekly", db: AsyncSession = Depends(get_db)):
    """Return aggregated log data for chart visualization.
    period: 'weekly' (7 hari terakhir) or 'monthly' (12 bulan terakhir)
    All dates in WIB (UTC+7).
    """
    from datetime import datetime, timedelta, timezone
    
    wib = timezone(timedelta(hours=7))
    now_wib = datetime.now(wib)
    
    if period == "monthly":
        # Last 12 months
        data = []
        for i in range(11, -1, -1):
            # Get first day of each month
            target = now_wib.replace(day=1) - timedelta(days=i * 30)
            month_start = target.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1)
            
            count = await db.scalar(
                select(func.count(APILog.id)).where(
                    APILog.created_at >= month_start,
                    APILog.created_at < month_end
                )
            )
            tokens = await db.scalar(
                select(func.coalesce(func.sum(APILog.tokens_used), 0)).where(
                    APILog.created_at >= month_start,
                    APILog.created_at < month_end
                )
            )
            
            bulan_indo = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
            label = f"{bulan_indo[month_start.month - 1]} {month_start.year}"
            data.append({"label": label, "calls": count or 0, "tokens": tokens or 0})
        return data
    else:
        # Last 7 days
        data = []
        for i in range(6, -1, -1):
            day = now_wib - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            count = await db.scalar(
                select(func.count(APILog.id)).where(
                    APILog.created_at >= day_start,
                    APILog.created_at < day_end
                )
            )
            tokens = await db.scalar(
                select(func.coalesce(func.sum(APILog.tokens_used), 0)).where(
                    APILog.created_at >= day_start,
                    APILog.created_at < day_end
                )
            )
            
            label = day.strftime("%d/%m")
            data.append({"label": label, "calls": count or 0, "tokens": tokens or 0})
        return data

@app.api_route("/api/{route_name}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def dynamic_api(route_name: str, request: Request, db: AsyncSession = Depends(get_db)):
    # Find endpoint
    result = await db.execute(select(APIEndpoint).where(APIEndpoint.route_name == route_name))
    endpoint = result.scalars().first()
    
    if not endpoint:
        raise HTTPException(status_code=404, detail="API Route not found")
        
    if request.method.upper() != endpoint.http_method.upper():
        raise HTTPException(status_code=405, detail=f"Method Not Allowed. Expected {endpoint.http_method.upper()}")
        
    start_time = time.time()
    
    # Parse payload if exists
    payload = {}
    if request.method in ["POST", "PUT", "PATCH"]:
        try:
            payload = await request.json()
        except:
            payload = {}
    else:
        payload = dict(request.query_params)
        
    # Format prompt
    final_prompt_text = endpoint.prompt_template
    try:
        final_prompt_text = final_prompt_text.format(**payload)
        # Prepend strict rules for technical tasks (SQL/JSON) to avoid conversational bloat
        upper_prompt = final_prompt_text.upper()
        if any(kw in upper_prompt for kw in ["SELECT", "UPDATE", "INSERT", "DELETE", "SQL", "DATABASE", "TABLE"]):
            final_prompt_text = "TUGAS: HASILKAN KODE SQL MURNI. JANGAN BERIKAN PENJELASAN, JANGAN GUNAKAN MARKDOWN TERLUAR, JANGAN ADA TEXT PEMBUKA/PENUTUP.\n\n" + final_prompt_text
        elif "JSON" in upper_prompt:
            final_prompt_text = "TUGAS: HASILKAN JSON MURNI TERVALIDASI. JANGAN ADA TEXT LAIN.\n\n" + final_prompt_text
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing required parameter in payload: {e}")
        
    # Call AI
    try:
        tokens_used = 0
        
        # Use Gemini default for all forged APIs
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=final_prompt_text
        )
        ai_response_text = response.text
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            tokens_used = response.usage_metadata.total_token_count
                
        # Format response (execute SQL if AI generated SQL)
        try:
            clean_text = ai_response_text.strip()
            
            # More robust code extraction: if not starting with code block, try to find one inside
            import re
            code_block_match = re.search(r"```(?:sql|json|)?\s*(.*?)\s*```", clean_text, re.DOTALL)
            if code_block_match:
                clean_text = code_block_match.group(1).strip()
            elif clean_text.startswith("```"):
                if clean_text.startswith("```sql"): clean_text = clean_text[6:-3].strip()
                elif clean_text.startswith("```json"): clean_text = clean_text[7:-3].strip()
                else: clean_text = clean_text[3:-3].strip()

            upper_text = clean_text.upper()
            is_sql = (upper_text.startswith("SELECT ") or 
                      upper_text.startswith("UPDATE ") or 
                      upper_text.startswith("DELETE ") or 
                      upper_text.startswith("INSERT "))
            
            if is_sql:
                from sqlalchemy import text
                from fastapi.encoders import jsonable_encoder
                try:
                    result = await db.execute(text(clean_text))
                    if upper_text.startswith("SELECT"):
                        rows = result.mappings().all()
                        ai_response = jsonable_encoder([dict(r) for r in rows])
                    else:
                        ai_response = {"success": True, "sql_executed": clean_text}
                except Exception as db_err:
                    await db.rollback()
                    ai_response = {"error": "SQL execution failed", "detail": str(db_err), "generated_sql": clean_text}
            else:
                try:
                    ai_response = json.loads(clean_text)
                except ValueError:
                    ai_response = {"result": clean_text}
        except Exception:
            ai_response = {"result": ai_response_text}
            
        # Very rough cost estimation (simplified to $0.0001 per 1000 tokens for all models)
        cost = (tokens_used / 1000.0) * 0.0001
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Model Error: {str(e)}")
        
    end_time = time.time()
    elapsed_ms = (end_time - start_time) * 1000
    
    import json
    # Log usage
    api_log = APILog(
        endpoint_id=endpoint.id,
        request_payload=payload,
        response_payload=json.dumps(ai_response) if isinstance(ai_response, (dict, list)) else str(ai_response),
        tokens_used=tokens_used,
        response_time_ms=elapsed_ms,
        cost=cost
    )
    db.add(api_log)
    await db.commit()
    
    return JSONResponse(content=ai_response)
