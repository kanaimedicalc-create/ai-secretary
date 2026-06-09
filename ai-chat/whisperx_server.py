"""
WhisperX (faster-whisper) ローカル音声認識サーバー
起動: source ~/whisperx-env/bin/activate && python whisperx_server.py
"""
import io
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_SIZE = "base"  # tiny / base / small / medium / large-v3
model: Optional[WhisperModel] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    logger.info(f"Loading Whisper model: {MODEL_SIZE} ...")
    model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
    logger.info("Model loaded. Server ready.")
    yield
    model = None


app = FastAPI(title="WhisperX Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_SIZE}


@app.post("/asr")
async def transcribe(
    audio_file: UploadFile = File(...),
    task: str = Query(default="transcribe"),
    language: str = Query(default="ja"),
    output: str = Query(default="json"),
):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    audio_bytes = await audio_file.read()
    audio_stream = io.BytesIO(audio_bytes)

    try:
        segments, info = model.transcribe(
            audio_stream,
            language=language if language != "auto" else None,
            task=task,
            beam_size=5,
            vad_filter=True,
        )
        text = " ".join(seg.text.strip() for seg in segments)
        logger.info(f"Transcribed ({info.language}, {info.duration:.1f}s): {text[:80]}")
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"text": text, "language": info.language}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000, log_level="info")
