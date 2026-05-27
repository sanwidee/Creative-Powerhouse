
import React, { useRef, useEffect, useState } from 'react';
import { MousePointer2, Pencil, Square, Circle, Type, Eraser, Save, X, RotateCcw, Check } from 'lucide-react';

interface AnnotationCanvasProps {
    imageSource: string;
    onSave: (annotatedImage: string) => void;
    onCancel: () => void;
}

type Tool = 'pencil' | 'rect' | 'circle' | 'text' | 'eraser';

const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({ imageSource, onSave, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<Tool>('pencil');
    const [color, setColor] = useState('#6366f1'); // Indigo 500
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [history, setHistory] = useState<ImageData[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageSource;
        img.onload = () => {
            // Set canvas size to match image or container aspect
            // For precision, we want to match the image resolution
            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);
            contextRef.current = ctx;

            // Save initial state to history
            setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
        };
    }, [imageSource]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const { offsetLeft, offsetTop } = canvasRef.current!;
        const x = (e as any).nativeEvent.offsetX || (e as any).touches[0].clientX - offsetLeft;
        const y = (e as any).nativeEvent.offsetY || (e as any).touches[0].clientY - offsetTop;

        setStartPos({ x, y });
        setIsDrawing(true);

        if (tool === 'pencil' || tool === 'eraser') {
            contextRef.current!.beginPath();
            contextRef.current!.moveTo(x, y);
            contextRef.current!.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
            contextRef.current!.lineWidth = tool === 'eraser' ? 20 : 4;
            contextRef.current!.lineCap = 'round';
        }

        if (tool === 'text') {
            const text = window.prompt('Enter annotation text:');
            if (text) {
                contextRef.current!.font = 'bold 32px Inter, sans-serif';
                contextRef.current!.fillStyle = color;
                contextRef.current!.fillText(text, x, y);
                saveToHistory();
            }
            setIsDrawing(false);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = (e as any).nativeEvent;
        const ctx = contextRef.current!;

        if (tool === 'pencil' || tool === 'eraser') {
            ctx.lineTo(offsetX, offsetY);
            ctx.stroke();
        } else {
            // Shape preview: restore previous state before drawing shape
            if (history.length > 0) {
                ctx.putImageData(history[history.length - 1], 0, 0);
            }
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;

            if (tool === 'rect') {
                ctx.strokeRect(startPos.x, startPos.y, offsetX - startPos.x, offsetY - startPos.y);
            } else if (tool === 'circle') {
                const radius = Math.sqrt(Math.pow(offsetX - startPos.x, 2) + Math.pow(offsetY - startPos.y, 2));
                ctx.beginPath();
                ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
                ctx.stroke();
            }
        }
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        contextRef.current!.closePath();
        setIsDrawing(false);
        saveToHistory();
    };

    const saveToHistory = () => {
        const canvas = canvasRef.current!;
        const ctx = contextRef.current!;
        const newData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([...history, newData]);
    };

    const undo = () => {
        if (history.length <= 1) return;
        const newHistory = [...history];
        newHistory.pop();
        setHistory(newHistory);
        contextRef.current!.putImageData(newHistory[newHistory.length - 1], 0, 0);
    };

    const handleApply = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        onSave(canvas.toDataURL('image/png'));
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center animate-in fade-in duration-300">
            {/* TOOLBAR */}
            <div className="w-full h-20 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-8">
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            <Pencil size={18} className="text-indigo-400" />
                        </div>
                        <span className="text-sm font-bold tracking-tight text-white">Annotation Studio</span>
                    </div>

                    <div className="h-8 w-px bg-slate-800" />

                    <div className="flex items-center space-x-2 bg-slate-800/40 p-1.5 rounded-xl border border-slate-700/50">
                        <ToolBtn active={tool === 'pencil'} icon={<Pencil size={16} />} onClick={() => setTool('pencil')} />
                        <ToolBtn active={tool === 'rect'} icon={<Square size={16} />} onClick={() => setTool('rect')} />
                        <ToolBtn active={tool === 'circle'} icon={<Circle size={16} />} onClick={() => setTool('circle')} />
                        <ToolBtn active={tool === 'text'} icon={<Type size={16} />} onClick={() => setTool('text')} />
                        <ToolBtn active={tool === 'eraser'} icon={<Eraser size={16} />} onClick={() => setTool('eraser')} />
                    </div>

                    <div className="flex items-center space-x-3">
                        {['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#ffffff'].map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-white scale-125' : 'border-transparent opacity-50'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <button onClick={undo} className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all flex items-center space-x-2">
                        <RotateCcw size={18} />
                        <span className="text-xs font-bold">Undo</span>
                    </button>
                    <button onClick={onCancel} className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-all">
                        <X size={20} />
                    </button>
                    <button onClick={handleApply} className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center space-x-2 shadow-lg shadow-indigo-500/20 transition-all">
                        <Check size={18} />
                        <span>Apply Visual Reference</span>
                    </button>
                </div>
            </div>

            {/* CANVAS AREA */}
            <div className="flex-1 w-full overflow-auto flex items-center justify-center p-12">
                <div className="bg-black shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden cursor-crosshair">
                    <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseOut={stopDrawing}
                        className="max-w-full max-h-[80vh] object-contain"
                    />
                </div>
            </div>

            <div className="p-4 bg-slate-900/80 border-t border-slate-800 w-full text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Draw on the image to tell the AI exactly what to change</p>
            </div>
        </div>
    );
};

const ToolBtn = ({ active, icon, onClick }: { active: boolean, icon: React.ReactNode, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`p-2.5 rounded-lg transition-all ${active ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
    >
        {icon}
    </button>
);

export default AnnotationCanvas;
