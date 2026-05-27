/**
 * Voice Cloning Service - Frontend API client for Python voice server
 */

const VOICE_SERVER_URL = 'http://localhost:8000';

export interface VoiceDNA {
    id: string;
    name: string;
    created_at: number;
    source_type: 'microphone' | 'upload';
    source_duration_sec: number;
    sample_rate: number;
    model_version: string;
}

interface HealthResponse {
    status: string;
    model_loaded: boolean;
    voice_dna_dir: string;
    model_dir: string;
}

interface ExtractEmbeddingResponse {
    success: boolean;
    voice_dna: VoiceDNA;
    embedding_path: string;
}

interface ListVoiceDNAResponse {
    voices: VoiceDNA[];
}

/**
 * Check if voice server is running and model is loaded
 */
export const checkVoiceServerHealth = async (): Promise<HealthResponse> => {
    const response = await fetch(`${VOICE_SERVER_URL}/health`);
    if (!response.ok) {
        throw new Error('Voice server not responding');
    }
    return response.json();
};

/**
 * Extract speaker embedding from audio file
 */
export const extractVoiceDNA = async (
    audioBlob: Blob,
    name: string,
    onProgress?: (message: string) => void
): Promise<VoiceDNA> => {
    onProgress?.('Uploading audio...');

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('name', name);

    onProgress?.('Extracting voice DNA (this may take 30-60 seconds)...');

    const response = await fetch(`${VOICE_SERVER_URL}/extract-embedding`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to extract voice DNA');
    }

    const result: ExtractEmbeddingResponse = await response.json();

    if (!result.success) {
        throw new Error('Voice DNA extraction failed');
    }

    return result.voice_dna;
};

/**
 * Generate speech from text using a Voice DNA
 */
export const generateClonedSpeech = async (
    text: string,
    voiceDnaId: string
): Promise<string> => {
    const formData = new FormData();
    formData.append('text', text);
    formData.append('voice_dna_id', voiceDnaId);

    const response = await fetch(`${VOICE_SERVER_URL}/generate-speech`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate speech');
    }

    // Convert response to audio URL
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
};

/**
 * List all saved Voice DNA assets
 */
export const listVoiceDNA = async (): Promise<VoiceDNA[]> => {
    const response = await fetch(`${VOICE_SERVER_URL}/voice-dna`);

    if (!response.ok) {
        throw new Error('Failed to list voice DNA');
    }

    const result: ListVoiceDNAResponse = await response.json();
    return result.voices;
};

/**
 * Delete a Voice DNA asset
 */
export const deleteVoiceDNA = async (voiceId: string): Promise<void> => {
    const response = await fetch(`${VOICE_SERVER_URL}/voice-dna/${voiceId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete voice DNA');
    }
};

/**
 * Export Voice DNA embedding file
 */
export const exportVoiceDNA = async (voiceId: string): Promise<Blob> => {
    const response = await fetch(`${VOICE_SERVER_URL}/voice-dna/${voiceId}/export`);

    if (!response.ok) {
        throw new Error('Failed to export voice DNA');
    }

    return response.blob();
};
