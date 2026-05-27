"""
XTTS Service - Coqui TTS wrapper for voice cloning
"""

import os
import logging

# Accept Coqui TTS license agreement (CPML for non-commercial use)
# This prevents the interactive prompt that blocks background processes
os.environ["COQUI_TOS_AGREED"] = "1"

import torch
import torchaudio
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class XTTSService:
    """
    Wrapper for Coqui XTTS v2 model.
    Handles model loading, speaker embedding extraction, and TTS synthesis.
    """
    
    def __init__(self, model_dir: str):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        
        self.model = None
        self.config = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        logger.info(f"🖥️ Using device: {self.device}")
    
    def is_model_loaded(self) -> bool:
        """Check if model is loaded"""
        return self.model is not None
    
    def load_model(self):
        """
        Load XTTS v2 model. Downloads if not cached.
        This is a heavy operation (~2GB download, several minutes).
        """
        if self.model is not None:
            logger.info("Model already loaded")
            return
        
        try:
            from TTS.api import TTS
            
            logger.info("📦 Loading XTTS v2 model...")
            logger.info("   (First run will download ~2GB model)")
            
            # Use TTS API to load XTTS v2
            # Model will be downloaded to ~/.local/share/tts/ on first run
            self.model = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
            
            # Move to appropriate device
            if self.device == "cuda":
                self.model.to(self.device)
            
            logger.info("✅ XTTS v2 model loaded successfully")
            
        except ImportError:
            raise RuntimeError(
                "TTS package not installed. Run: pip install TTS"
            )
        except Exception as e:
            logger.error(f"Failed to load XTTS model: {e}")
            raise
    
    def extract_speaker_embedding(
        self,
        audio_path: str,
        output_path: str
    ) -> None:
        """
        Extract speaker embedding from reference audio.
        
        Args:
            audio_path: Path to preprocessed audio file (22050 Hz, mono, WAV)
            output_path: Path to save embedding (.pt file)
        """
        if not self.is_model_loaded():
            self.load_model()
        
        audio_path = Path(audio_path)
        output_path = Path(output_path)
        
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        try:
            # Load and compute speaker latents using XTTS
            logger.info(f"🧬 Computing speaker embedding from {audio_path}")
            
            # Get the internal XTTS model
            xtts_model = self.model.synthesizer.tts_model
            
            # Compute speaker latents (this is the "embedding")
            gpt_cond_latent, speaker_embedding = xtts_model.get_conditioning_latents(
                audio_path=str(audio_path)
            )
            
            # Save both latents as a dictionary
            embedding_data = {
                "gpt_cond_latent": gpt_cond_latent,
                "speaker_embedding": speaker_embedding
            }
            
            torch.save(embedding_data, output_path)
            logger.info(f"✅ Speaker embedding saved: {output_path}")
            
        except Exception as e:
            logger.error(f"Embedding extraction failed: {e}")
            raise
    
    def synthesize(
        self,
        text: str,
        speaker_embedding_path: str,
        output_path: str,
        language: str = "en"
    ) -> None:
        """
        Synthesize speech from text using saved speaker embedding.
        
        Args:
            text: Text to synthesize
            speaker_embedding_path: Path to .pt embedding file
            output_path: Path to save generated audio
            language: Language code (en, es, fr, de, it, pt, pl, tr, ru, nl, cs, ar, zh-cn, ja, ko, hu)
        """
        if not self.is_model_loaded():
            self.load_model()
        
        embedding_path = Path(speaker_embedding_path)
        if not embedding_path.exists():
            raise FileNotFoundError(f"Embedding not found: {embedding_path}")
        
        try:
            # Load speaker embedding
            embedding_data = torch.load(embedding_path, map_location=self.device)
            gpt_cond_latent = embedding_data["gpt_cond_latent"]
            speaker_embedding = embedding_data["speaker_embedding"]
            
            # Get the internal XTTS model
            xtts_model = self.model.synthesizer.tts_model
            
            logger.info(f"🎤 Synthesizing: '{text[:50]}...'")
            
            # Generate speech
            out = xtts_model.inference(
                text=text,
                language=language,
                gpt_cond_latent=gpt_cond_latent,
                speaker_embedding=speaker_embedding,
            )
            
            # Save to file
            wav = torch.tensor(out["wav"]).unsqueeze(0)
            torchaudio.save(output_path, wav, 24000)
            
            logger.info(f"✅ Audio saved: {output_path}")
            
        except Exception as e:
            logger.error(f"TTS synthesis failed: {e}")
            raise
    
    def cleanup(self):
        """Cleanup model resources"""
        if self.model is not None:
            del self.model
            self.model = None
            
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            logger.info("🧹 Model resources cleaned up")
