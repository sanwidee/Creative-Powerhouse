"""
Audio Processor - FFmpeg-based audio preprocessing for XTTS
"""

import subprocess
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class AudioProcessor:
    """Handles audio preprocessing for XTTS voice cloning"""
    
    # XTTS requires 22050 Hz sample rate
    TARGET_SAMPLE_RATE = 22050
    
    def __init__(self):
        self._check_ffmpeg()
    
    def _check_ffmpeg(self):
        """Verify ffmpeg is available"""
        try:
            result = subprocess.run(
                ["ffmpeg", "-version"],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                raise RuntimeError("ffmpeg not working properly")
            logger.info("✅ ffmpeg available")
        except FileNotFoundError:
            raise RuntimeError(
                "ffmpeg not found. Please install ffmpeg:\n"
                "  macOS: brew install ffmpeg\n"
                "  Ubuntu: sudo apt install ffmpeg\n"
                "  Windows: https://ffmpeg.org/download.html"
            )
    
    def preprocess_for_xtts(
        self,
        input_path: str,
        output_path: str,
        max_duration: float = 30.0
    ) -> float:
        """
        Preprocess audio for XTTS speaker embedding extraction.
        
        - Converts to mono
        - Resamples to 22050 Hz
        - Normalizes audio level
        - Trims silence
        - Limits duration
        
        Args:
            input_path: Path to input audio file
            output_path: Path to save processed WAV
            max_duration: Maximum duration in seconds
            
        Returns:
            Duration of processed audio in seconds
        """
        input_path = Path(input_path)
        output_path = Path(output_path)
        
        if not input_path.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        # Build ffmpeg command
        cmd = [
            "ffmpeg",
            "-y",  # Overwrite output
            "-i", str(input_path),
            # Audio filters
            "-af", ",".join([
                "silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB",  # Trim start silence
                "areverse",
                "silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB",  # Trim end silence
                "areverse",
                "loudnorm=I=-16:TP=-1.5:LRA=11",  # Normalize loudness
            ]),
            # Output format
            "-ac", "1",  # Mono
            "-ar", str(self.TARGET_SAMPLE_RATE),  # Sample rate
            "-t", str(max_duration),  # Max duration
            "-acodec", "pcm_s16le",  # 16-bit PCM
            str(output_path)
        ]
        
        logger.info(f"🔧 Running ffmpeg preprocessing...")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            logger.error(f"ffmpeg error: {result.stderr}")
            raise RuntimeError(f"Audio preprocessing failed: {result.stderr}")
        
        # Get duration of output file
        duration = self.get_duration(str(output_path))
        
        return duration
    
    def get_duration(self, audio_path: str) -> float:
        """Get duration of audio file in seconds"""
        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            audio_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise RuntimeError(f"Failed to get audio duration: {result.stderr}")
        
        return float(result.stdout.strip())
    
    def convert_to_wav(self, input_path: str, output_path: str) -> None:
        """Simple conversion to WAV without preprocessing"""
        cmd = [
            "ffmpeg",
            "-y",
            "-i", input_path,
            "-ac", "1",
            "-ar", str(self.TARGET_SAMPLE_RATE),
            "-acodec", "pcm_s16le",
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise RuntimeError(f"WAV conversion failed: {result.stderr}")
