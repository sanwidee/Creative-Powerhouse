"""
Voice Cloning Server - FastAPI backend for Coqui XTTS v2
Handles speaker embedding extraction and TTS synthesis
"""

import os
import json
import uuid
import logging
from pathlib import Path
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import uvicorn

from services.xtts_service import XTTSService
from services.audio_processor import AudioProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Paths
BASE_DIR = Path(__file__).parent.parent
VOICE_DNA_DIR = BASE_DIR / "voice_dna"
TEMP_DIR = Path(__file__).parent / "temp"
MODEL_DIR = Path(__file__).parent / "models"

# Create directories
VOICE_DNA_DIR.mkdir(exist_ok=True)
TEMP_DIR.mkdir(exist_ok=True)
MODEL_DIR.mkdir(exist_ok=True)

# Global services
xtts_service: XTTSService = None
audio_processor: AudioProcessor = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup"""
    global xtts_service, audio_processor
    
    logger.info("🚀 Starting Voice Cloning Server...")
    logger.info(f"📂 Voice DNA directory: {VOICE_DNA_DIR}")
    logger.info(f"📂 Model cache directory: {MODEL_DIR}")
    
    # Initialize audio processor
    audio_processor = AudioProcessor()
    logger.info("✅ Audio processor initialized")
    
    # Initialize XTTS (lazy load model on first use)
    xtts_service = XTTSService(model_dir=str(MODEL_DIR))
    logger.info("✅ XTTS service initialized (model will load on first use)")
    
    yield
    
    # Cleanup
    logger.info("🛑 Shutting down Voice Cloning Server...")
    if xtts_service:
        xtts_service.cleanup()


app = FastAPI(
    title="Voice Cloning Server",
    description="Local voice cloning using Coqui XTTS v2",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Check server and model status"""
    model_loaded = xtts_service.is_model_loaded() if xtts_service else False
    return {
        "status": "ok",
        "model_loaded": model_loaded,
        "voice_dna_dir": str(VOICE_DNA_DIR),
        "model_dir": str(MODEL_DIR)
    }


@app.post("/extract-embedding")
async def extract_embedding(
    audio: UploadFile = File(...),
    name: str = Form("My Voice")
):
    """
    Extract speaker embedding from uploaded audio.
    Returns Voice DNA metadata and saves embedding to disk.
    """
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")
    
    # Generate unique ID
    voice_id = f"vdna_{int(datetime.now().timestamp() * 1000)}"
    temp_input = TEMP_DIR / f"{voice_id}_input{Path(audio.filename).suffix}"
    temp_processed = TEMP_DIR / f"{voice_id}_processed.wav"
    
    try:
        # Save uploaded file
        content = await audio.read()
        with open(temp_input, "wb") as f:
            f.write(content)
        logger.info(f"📥 Received audio: {audio.filename} ({len(content)} bytes)")
        
        # Preprocess audio
        logger.info("🔧 Preprocessing audio...")
        duration = audio_processor.preprocess_for_xtts(
            str(temp_input), 
            str(temp_processed)
        )
        logger.info(f"✅ Audio preprocessed: {duration:.2f}s")
        
        # Ensure model is loaded
        if not xtts_service.is_model_loaded():
            logger.info("📦 Loading XTTS model (first run, may take a while)...")
            xtts_service.load_model()
            logger.info("✅ Model loaded successfully")
        
        # Extract speaker embedding
        logger.info("🧬 Extracting speaker embedding...")
        embedding_path = VOICE_DNA_DIR / f"{voice_id}.pt"
        xtts_service.extract_speaker_embedding(
            str(temp_processed),
            str(embedding_path)
        )
        logger.info(f"✅ Embedding saved: {embedding_path}")
        
        # Create metadata
        metadata = {
            "id": voice_id,
            "name": name,
            "created_at": int(datetime.now().timestamp() * 1000),
            "source_type": "upload",
            "source_duration_sec": round(duration, 2),
            "sample_rate": 22050,
            "model_version": "xtts_v2"
        }
        
        metadata_path = VOICE_DNA_DIR / f"{voice_id}.json"
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        logger.info(f"✅ Metadata saved: {metadata_path}")
        
        return JSONResponse(content={
            "success": True,
            "voice_dna": metadata,
            "embedding_path": str(embedding_path)
        })
        
    except Exception as e:
        logger.error(f"❌ Embedding extraction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Cleanup temp files
        if temp_input.exists():
            temp_input.unlink()
        if temp_processed.exists():
            temp_processed.unlink()


@app.post("/generate-speech")
async def generate_speech(
    text: str = Form(...),
    voice_dna_id: str = Form(...)
):
    """
    Generate speech from text using a saved Voice DNA.
    Returns WAV audio file.
    """
    # Find embedding
    embedding_path = VOICE_DNA_DIR / f"{voice_dna_id}.pt"
    if not embedding_path.exists():
        raise HTTPException(status_code=404, detail=f"Voice DNA not found: {voice_dna_id}")
    
    output_path = TEMP_DIR / f"tts_{uuid.uuid4().hex}.wav"
    
    try:
        # Ensure model is loaded
        if not xtts_service.is_model_loaded():
            logger.info("📦 Loading XTTS model...")
            xtts_service.load_model()
        
        # Generate speech
        logger.info(f"🎤 Generating speech: '{text[:50]}...' with {voice_dna_id}")
        xtts_service.synthesize(
            text=text,
            speaker_embedding_path=str(embedding_path),
            output_path=str(output_path)
        )
        logger.info(f"✅ Speech generated: {output_path}")
        
        return FileResponse(
            str(output_path),
            media_type="audio/wav",
            filename=f"speech_{voice_dna_id}.wav",
            background=None  # Don't delete after sending
        )
        
    except Exception as e:
        logger.error(f"❌ TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/voice-dna")
async def list_voice_dna():
    """List all saved Voice DNA assets"""
    voices = []
    
    for json_file in VOICE_DNA_DIR.glob("*.json"):
        try:
            with open(json_file) as f:
                metadata = json.load(f)
                # Check if embedding exists
                embedding_path = VOICE_DNA_DIR / f"{metadata['id']}.pt"
                if embedding_path.exists():
                    voices.append(metadata)
        except Exception as e:
            logger.warning(f"Failed to load {json_file}: {e}")
    
    # Sort by created_at descending
    voices.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    
    return {"voices": voices}


@app.delete("/voice-dna/{voice_id}")
async def delete_voice_dna(voice_id: str):
    """Delete a Voice DNA asset"""
    embedding_path = VOICE_DNA_DIR / f"{voice_id}.pt"
    metadata_path = VOICE_DNA_DIR / f"{voice_id}.json"
    
    deleted = False
    if embedding_path.exists():
        embedding_path.unlink()
        deleted = True
    if metadata_path.exists():
        metadata_path.unlink()
        deleted = True
    
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Voice DNA not found: {voice_id}")
    
    return {"success": True, "deleted": voice_id}


@app.get("/voice-dna/{voice_id}/export")
async def export_voice_dna(voice_id: str):
    """Export Voice DNA embedding file"""
    embedding_path = VOICE_DNA_DIR / f"{voice_id}.pt"
    
    if not embedding_path.exists():
        raise HTTPException(status_code=404, detail=f"Voice DNA not found: {voice_id}")
    
    return FileResponse(
        str(embedding_path),
        media_type="application/octet-stream",
        filename=f"{voice_id}.pt"
    )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
