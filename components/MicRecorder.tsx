/**
 * MicRecorder - Browser microphone recording component with waveform visualization
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Trash2, Upload, AlertCircle } from 'lucide-react';

interface MicRecorderProps {
    onRecordingComplete: (blob: Blob) => void;
    maxDuration?: number; // seconds
    minDuration?: number; // seconds
}

const MicRecorder: React.FC<MicRecorderProps> = ({
    onRecordingComplete,
    maxDuration = 30,
    minDuration = 5
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [waveformData, setWaveformData] = useState<number[]>(new Array(50).fill(0));

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const updateWaveform = useCallback(() => {
        if (!analyserRef.current || !isRecording) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Sample 50 points from the frequency data
        const step = Math.floor(dataArray.length / 50);
        const newData = Array.from({ length: 50 }, (_, i) => {
            const value = dataArray[i * step] / 255;
            return value;
        });

        setWaveformData(newData);
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
    }, [isRecording]);

    const startRecording = async () => {
        try {
            setError(null);
            setAudioBlob(null);
            setAudioUrl(null);
            setDuration(0);
            audioChunksRef.current = [];

            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });
            streamRef.current = stream;

            // Set up audio analysis for waveform
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Create MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());

                // Reset waveform
                setWaveformData(new Array(50).fill(0));
            };

            // Start recording
            mediaRecorder.start(100); // Collect data every 100ms
            setIsRecording(true);

            // Start duration timer
            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    const newDuration = prev + 1;
                    if (newDuration >= maxDuration) {
                        stopRecording();
                    }
                    return newDuration;
                });
            }, 1000);

            // Start waveform animation
            updateWaveform();

        } catch (err: any) {
            console.error('Recording error:', err);
            setError(err.message || 'Failed to access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        }
    };

    const discardRecording = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(null);
        setAudioUrl(null);
        setDuration(0);
    };

    const handleConfirm = () => {
        if (audioBlob && duration >= minDuration) {
            onRecordingComplete(audioBlob);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const isValidDuration = duration >= minDuration;

    return (
        <div className="space-y-6">
            {/* Waveform Visualization */}
            <div className="h-24 bg-slate-900/50 rounded-2xl border border-slate-800 flex items-center justify-center px-4 overflow-hidden">
                {isRecording ? (
                    <div className="flex items-end justify-center space-x-1 h-16">
                        {waveformData.map((value, i) => (
                            <div
                                key={i}
                                className="w-1 bg-gradient-to-t from-pink-500 to-indigo-500 rounded-full transition-all duration-75"
                                style={{ height: `${Math.max(4, value * 64)}px` }}
                            />
                        ))}
                    </div>
                ) : audioUrl ? (
                    <audio src={audioUrl} controls className="w-full" />
                ) : (
                    <div className="text-center text-slate-500">
                        <Mic size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-xs uppercase tracking-widest font-bold">Ready to record</p>
                    </div>
                )}
            </div>

            {/* Duration & Status */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    {isRecording && (
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-red-400 text-xs font-bold uppercase">Recording</span>
                        </div>
                    )}
                    <span className="text-2xl font-mono font-bold">
                        {formatTime(duration)}
                    </span>
                    <span className="text-xs text-slate-500">/ {formatTime(maxDuration)}</span>
                </div>

                {!isRecording && audioBlob && !isValidDuration && (
                    <div className="flex items-center space-x-2 text-amber-400">
                        <AlertCircle size={14} />
                        <span className="text-xs font-bold">Min {minDuration}s required</span>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-3">
                {!isRecording && !audioBlob && (
                    <button
                        onClick={startRecording}
                        className="flex-1 py-4 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-pink-500/20"
                    >
                        <Mic size={20} />
                        <span>Start Recording</span>
                    </button>
                )}

                {isRecording && (
                    <button
                        onClick={stopRecording}
                        className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all"
                    >
                        <Square size={20} className="fill-white" />
                        <span>Stop Recording</span>
                    </button>
                )}

                {!isRecording && audioBlob && (
                    <>
                        <button
                            onClick={discardRecording}
                            className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all"
                        >
                            <Trash2 size={18} />
                            <span>Discard</span>
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!isValidDuration}
                            className="flex-1 py-4 bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-green-500/20"
                        >
                            <Upload size={18} />
                            <span>Use This Recording</span>
                        </button>
                    </>
                )}
            </div>

            {/* Tips */}
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Recording Tips</h4>
                <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Speak naturally for 10-30 seconds</li>
                    <li>• Use a quiet environment</li>
                    <li>• Keep consistent distance from mic</li>
                    <li>• Read varied content for best results</li>
                </ul>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <strong>Error:</strong> {error}
                </div>
            )}
        </div>
    );
};

export default MicRecorder;
