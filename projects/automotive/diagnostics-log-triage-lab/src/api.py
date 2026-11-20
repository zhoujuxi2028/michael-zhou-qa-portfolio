"""FastAPI 薄层（DLT-13，architecture §6.2）。只调用 pipeline.run，不写磁盘。"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, StrictStr, ValidationError

from src.pipeline import run
from src.report import result_to_dict

MAX_BYTES = 5 * 1024 * 1024


class TriageRequest(BaseModel):
    trace: StrictStr


def create_app(max_bytes: int = MAX_BYTES) -> FastAPI:
    app = FastAPI(title="Diagnostics Log Triage Lab", version="0.1.0")
    app.state.last = None

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    @app.post("/triage")
    async def triage(request: Request) -> dict:
        declared = request.headers.get("content-length")
        if declared is not None and declared.isdigit() and int(declared) > max_bytes:
            raise HTTPException(status_code=413, detail=f"payload exceeds {max_bytes} bytes")
        body = await request.body()
        if len(body) > max_bytes:
            raise HTTPException(status_code=413, detail=f"payload exceeds {max_bytes} bytes")
        try:
            req = TriageRequest.model_validate_json(body)
        except ValidationError as e:
            raise HTTPException(
                status_code=422, detail=e.errors(include_url=False, include_input=False, include_context=False)
            ) from None
        if not req.trace.strip():
            raise HTTPException(status_code=422, detail="trace is empty")
        data = result_to_dict(run(req.trace))
        app.state.last = data
        return data

    @app.get("/clusters")
    def clusters() -> dict:
        if app.state.last is None:
            raise HTTPException(status_code=404, detail="no triage result yet")
        return {"clusters": app.state.last["clusters"], "incidents": len(app.state.last["incidents"])}

    return app


app = create_app()
