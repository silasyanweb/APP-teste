import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, Bell, Settings, Check, AlertCircle, 
  ListPlus, ClipboardList, LineChart, DollarSign, 
  FolderOpen, Home, Calendar, MessageCircle, User,
  Film, X, Upload, Key, Loader2
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

function VeoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [hasKey, setHasKey] = useState(true);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkApiKey();
    }
  }, [isOpen]);

  const checkApiKey = async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      const has = await window.aistudio.hasSelectedApiKey();
      setHasKey(has);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleGenerate = async () => {
    if (!image) return;
    
    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(image);
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const mimeType = image.type;
          
          const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
          if (!apiKey) throw new Error("API Key not found. Please select a key.");
          
          const ai = new GoogleGenAI({ apiKey });
          
          let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt || 'A dynamic video',
            image: {
              imageBytes: base64Data,
              mimeType: mimeType,
            },
            config: {
              numberOfVideos: 1,
              resolution: '720p',
              aspectRatio: aspectRatio
            }
          });
          
          while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({operation: operation});
          }
          
          const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
          if (!downloadLink) throw new Error("No video generated");
          
          const response = await fetch(downloadLink, {
            method: 'GET',
            headers: {
              'x-goog-api-key': apiKey,
            },
          });
          
          if (!response.ok) {
             throw new Error("Failed to download video");
          }
          
          const videoBlob = await response.blob();
          setVideoUrl(URL.createObjectURL(videoBlob));
        } catch (err: any) {
          console.error(err);
          setError(err.message || "Failed to generate video");
          if (err.message?.includes("Requested entity was not found")) {
             setHasKey(false);
          }
        } finally {
          setIsGenerating(false);
        }
      };
      reader.onerror = () => {
        setError("Failed to read image file");
        setIsGenerating(false);
      };
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1e2a36] rounded-2xl w-full max-w-md overflow-hidden border border-slate-700 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-white font-bold text-lg">Animar com Veo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
          {!hasKey ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
              <Key className="w-12 h-12 text-[#258cf4]" />
              <p className="text-slate-300">Para gerar vídeos com Veo, você precisa selecionar uma chave de API com faturamento ativado.</p>
              <button onClick={handleSelectKey} className="bg-[#258cf4] text-white px-6 py-2 rounded-lg font-semibold">
                Selecionar Chave de API
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-300">Imagem Inicial</label>
                <div 
                  className="border-2 border-dashed border-slate-600 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#258cf4] transition-colors relative overflow-hidden bg-[#101922] min-h-[120px]"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                  ) : null}
                  <Upload className="w-8 h-8 text-slate-400 mb-2 relative z-10" />
                  <span className="text-sm text-slate-300 relative z-10">{image ? image.name : 'Clique para fazer upload'}</span>
                  <input 
                    id="image-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImage(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }} 
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-300">Prompt (Opcional)</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Descreva a animação..."
                  className="bg-[#101922] border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-[#258cf4] resize-none h-20"
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-300">Formato</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setAspectRatio('16:9')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${aspectRatio === '16:9' ? 'bg-[#258cf4]/20 border-[#258cf4] text-[#258cf4]' : 'bg-[#101922] border-slate-700 text-slate-400'}`}
                  >
                    16:9 (Paisagem)
                  </button>
                  <button 
                    onClick={() => setAspectRatio('9:16')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${aspectRatio === '9:16' ? 'bg-[#258cf4]/20 border-[#258cf4] text-[#258cf4]' : 'bg-[#101922] border-slate-700 text-slate-400'}`}
                  >
                    9:16 (Retrato)
                  </button>
                </div>
              </div>
              
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              {videoUrl && (
                <div className="mt-2 flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-300">Resultado</label>
                  <video src={videoUrl} controls className="w-full rounded-lg bg-black" autoPlay loop playsInline />
                </div>
              )}
            </>
          )}
        </div>
        
        {hasKey && (
          <div className="p-4 border-t border-slate-700">
            <button 
              onClick={handleGenerate}
              disabled={!image || isGenerating}
              className="w-full bg-[#258cf4] hover:bg-[#1a75d5] disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gerando Vídeo...
                </>
              ) : (
                <>
                  <Film className="w-5 h-5" />
                  Gerar Vídeo
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [isVeoModalOpen, setIsVeoModalOpen] = useState(false);

  return (
    <div className="bg-[#f5f7f8] dark:bg-[#101922] font-sans text-slate-900 dark:text-slate-100 min-h-screen flex flex-col items-center">
      <div className="w-full max-w-[480px] min-h-screen flex flex-col relative overflow-x-hidden shadow-2xl bg-[#101922]">
        
        {/* Header */}
        <header className="flex flex-col items-center pt-8 pb-4 px-6 relative z-10">
          <div className="flex items-center justify-between w-full mb-6">
            <div className="flex items-center gap-2">
              <Dumbbell className="text-[#258cf4] w-8 h-8" />
              <h2 className="text-white text-lg font-bold tracking-wide">MFIT PERSONAL</h2>
            </div>
            <div className="flex gap-3">
              <button className="bg-[#1e2a36]/50 hover:bg-[#1e2a36] p-2 rounded-full transition-colors text-slate-300 hover:text-white">
                <Bell className="w-5 h-5" />
              </button>
              <button className="bg-[#1e2a36]/50 hover:bg-[#1e2a36] p-2 rounded-full transition-colors text-slate-300 hover:text-white">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Profile Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full border-2 border-[#258cf4] p-1 overflow-hidden shadow-[0_0_15px_rgba(37,140,244,0.2)]">
                <img 
                  alt="Trainer Profile" 
                  className="w-full h-full object-cover rounded-full" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8rEPRp2Gaac-IhRCyJl7Ag2hgiAQ1Rd1vZvrU-DthClbblh6ClohUytTiA4KbrndhxNSjQL4p6X0yBH877APptUbtesJdBbVryQJfQUHuHWSx47efX8Ni26qmgg8jSswfpFZXHd3R79ORFP71FWl2lVHrcXvzgOx75gEbCOcch-ELQrOeHmn0N1zl7MTieMDTe5Obt0RN2lly6_3E1PAuI1X-6WHNm9Xa1K7P-gM3bpvIpP-pN0jwb42SAa495mW-i6mhPi0c8l0"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#258cf4] rounded-full border-2 border-[#101922] flex items-center justify-center">
                <Check className="text-white w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-white text-xl font-bold leading-tight">Viny Patrick Dias Araujo</h3>
              <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-wide">CREF: 019712-G/BA</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-5 pb-8 flex flex-col gap-6 w-full">
          {/* Greeting */}
          <div className="mt-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">Boa tarde, Silas!</h1>
            <p className="text-slate-400 text-sm mt-1">Pronto para o treino de hoje?</p>
          </div>

          {/* Weekly Tracker */}
          <section className="bg-[#1e2a36]/60 backdrop-blur-md border border-white/5 rounded-xl p-5 w-full relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#258cf4]/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex justify-between items-end mb-4 relative z-10">
              <div>
                <h4 className="text-white text-lg font-bold">Frequência de Treinos</h4>
                <p className="text-slate-400 text-xs">Acompanhe sua semana</p>
              </div>
              <button className="text-[#258cf4] text-xs font-bold hover:underline">Ver tudo</button>
            </div>
            <div className="flex justify-between items-center relative z-10">
              {/* Days */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full border border-[#258cf4]/40 bg-[#258cf4]/10 flex items-center justify-center text-[#258cf4] shadow-[0_0_8px_rgba(37,140,244,0.3)]">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-400">S</span>
              </div>
              {['T', 'Q', 'Q', 'S', 'S', 'D'].map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full border border-[#2c3e50] bg-transparent flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">{day}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Navigation Grid */}
          <section className="grid grid-cols-2 gap-4">
            {/* Veo Button */}
            <button 
              onClick={() => setIsVeoModalOpen(true)}
              className="col-span-2 bg-gradient-to-r from-[#1e2a36] to-[#253545] hover:from-[#253545] hover:to-[#2c3e50] active:scale-[0.98] transition-all duration-200 p-4 rounded-xl flex items-center gap-4 border border-[#258cf4]/30 group"
            >
              <div className="w-12 h-12 rounded-full bg-[#258cf4]/20 flex items-center justify-center group-hover:bg-[#258cf4]/30 transition-colors shadow-[0_0_15px_rgba(37,140,244,0.5)]">
                <Film className="text-[#258cf4] w-6 h-6" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-white font-bold text-base">Animar imagem com Veo</span>
                <span className="text-slate-400 text-xs">Gere vídeos incríveis com IA</span>
              </div>
            </button>

            <GridButton icon={Dumbbell} title="Treinos" />
            <GridButton icon={ListPlus} title="Treinos Extra" />
            <GridButton icon={ClipboardList} title="Avaliações" />
            <GridButton icon={LineChart} title="Meu Progresso" />
            <GridButton icon={DollarSign} title="Faturas" />
            <GridButton icon={FolderOpen} title="Arquivos" />
          </section>
        </main>

        {/* Bottom Tab Bar */}
        <nav className="sticky bottom-0 w-full bg-[#101922]/90 backdrop-blur-lg border-t border-slate-800/50 pb-6 pt-2 px-6">
          <div className="flex justify-between items-center">
            <button className="flex flex-col items-center gap-1 text-[#258cf4]">
              <Home className="w-6 h-6" />
              <span className="text-[10px] font-medium">Início</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300">
              <Calendar className="w-6 h-6" />
              <span className="text-[10px] font-medium">Agenda</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300">
              <MessageCircle className="w-6 h-6" />
              <span className="text-[10px] font-medium">Chat</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300">
              <User className="w-6 h-6" />
              <span className="text-[10px] font-medium">Perfil</span>
            </button>
          </div>
        </nav>
      </div>

      <VeoModal isOpen={isVeoModalOpen} onClose={() => setIsVeoModalOpen(false)} />
    </div>
  );
}

function GridButton({ icon: Icon, title }: { icon: any, title: string }) {
  return (
    <button className="bg-[#1e2a36] hover:bg-[#253545] active:scale-[0.98] transition-all duration-200 p-4 rounded-xl flex flex-col items-start gap-3 border border-slate-800/50 group">
      <div className="w-10 h-10 rounded-full bg-[#258cf4]/20 flex items-center justify-center group-hover:bg-[#258cf4]/30 transition-colors shadow-[0_0_15px_rgba(37,140,244,0.1)] group-hover:shadow-[0_0_15px_rgba(37,140,244,0.3)]">
        <Icon className="text-[#258cf4] w-5 h-5" />
      </div>
      <span className="text-white font-semibold text-sm">{title}</span>
    </button>
  );
}
