
import React, { useState, useRef, useEffect } from 'react';
import { analyzeChart, connectLiveAnalysis, scanMarketForSignals, predictContinuation } from './services/geminiService';
import { AnalysisResult, TradeMode } from './types';

// --- Componentes Auxiliares ---

const RobotIcon = ({ analyzing, alert }: { analyzing: boolean; alert?: boolean }) => {
  const statusColor = alert ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : analyzing ? 'bg-[#00f2ff] shadow-[0_0_10px_#00f2ff]' : 'bg-zinc-600';
  const borderColor = alert ? 'border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.5)]' : analyzing ? 'border-[#00f2ff] shadow-[0_0_30px_rgba(0,242,255,0.4)]' : 'border-zinc-700';

  return (
    <div className={`relative w-32 h-32 flex items-center justify-center transition-all duration-500 ${analyzing ? 'scale-110' : 'float'}`}>
      <div className={`relative w-24 h-20 bg-zinc-900 border-2 rounded-2xl flex flex-col items-center justify-center overflow-hidden transition-all duration-500 ${borderColor}`}>
        <div className="flex gap-4 mb-2">
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${statusColor} ${alert ? 'animate-ping' : analyzing ? 'scale-125' : ''}`}></div>
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${statusColor} ${alert ? 'animate-ping' : analyzing ? 'scale-125' : ''}`}></div>
        </div>
        <div className={`w-12 h-1 rounded-full transition-all duration-500 ${alert ? 'bg-amber-600 animate-pulse' : analyzing ? 'bg-[#00f2ff] animate-pulse' : 'bg-zinc-800'}`}></div>
        {analyzing && <div className="scan-line"></div>}
      </div>
      <div className="absolute top-0 flex gap-12">
        <div className={`w-1 h-4 bg-zinc-700 rounded-full transition-all ${alert ? 'bg-amber-500 h-6' : analyzing ? 'bg-[#00f2ff] h-6' : ''}`}></div>
        <div className={`w-1 h-4 bg-zinc-700 rounded-full transition-all ${alert ? 'bg-amber-500 h-6' : analyzing ? 'bg-[#00f2ff] h-6' : ''}`}></div>
      </div>
      <div className={`absolute -bottom-2 w-16 h-4 bg-zinc-800 rounded-full border border-zinc-700 transition-all ${alert ? 'shadow-[0_0_20px_rgba(245,158,11,0.3)]' : analyzing ? 'shadow-[0_0_20px_rgba(0,242,255,0.2)]' : ''}`}></div>
    </div>
  );
};

// --- Componente de Autenticação ---

const AuthScreen = ({ onAccessGranted }: { onAccessGranted: () => void }) => {
  const [step, setStep] = useState<'LOGIN' | 'REGISTER' | 'PENDING'>(() => {
    const userId = localStorage.getItem('trader_id');
    const approved = localStorage.getItem('trader_approved') === 'true';
    if (userId && !approved) return 'PENDING';
    return 'LOGIN';
  });

  const [email, setEmail] = useState('');
  const [loginId, setLoginId] = useState('');
  const [userId, setUserId] = useState(localStorage.getItem('trader_id') || '');

  // Whitelist para demonstração
  const WHITELISTED_IDS = ['TRADER-EKO8NSSO'];

  const handleLogout = () => {
    localStorage.removeItem('trader_id');
    localStorage.removeItem('trader_approved');
    // Redireciona para a raiz absoluta para evitar erros de roteamento
    window.location.href = window.location.origin + window.location.pathname;
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = 'TRADER-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem('trader_id', newId);
    localStorage.setItem('trader_approved', 'false');
    setUserId(newId);
    setStep('PENDING');
  };

  const checkApproval = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const idToVerify = (loginId || userId || '').trim();
    const isNowApproved = localStorage.getItem('trader_approved') === 'true' || WHITELISTED_IDS.includes(idToVerify);
    
    if (isNowApproved) {
      localStorage.setItem('trader_approved', 'true');
      localStorage.setItem('trader_id', idToVerify);
      onAccessGranted();
    } else if (idToVerify) {
      alert(`Acesso ainda não aprovado. Envie o ID para jovanegarcia94@gmail.com: ${idToVerify}`);
      setStep('PENDING');
    } else {
      alert("Por favor, insira um ID válido.");
    }
  };

  if (step === 'PENDING') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/50 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Acesso Pendente</h2>
        <p className="text-zinc-500 text-sm mb-8">Sua conta exige aprovação manual do Master Analyst Jovane Garcia.</p>
        
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
          <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest block mb-2">Seu ID Único de Trader:</span>
          <div className="text-xl font-mono font-bold text-[#00f2ff] tracking-widest bg-black p-4 rounded-xl border border-zinc-800 select-all">
            {userId}
          </div>
        </div>

        <div className="text-left space-y-4 mb-8">
          <p className="text-xs text-zinc-400 leading-relaxed italic border-l-2 border-[#00f2ff] pl-4">
            "Para ativar, envie o ID acima para <span className="text-white font-bold">jovanegarcia94@gmail.com</span>"
          </p>
        </div>

        <button 
          onClick={() => checkApproval()}
          className="w-full py-4 bg-[#00f2ff] text-black rounded-xl font-black text-xs uppercase tracking-widest transition-all mb-4 hover:shadow-[0_0_20px_rgba(0,242,255,0.4)]"
        >
          Verificar Status
        </button>
        
        <button onClick={handleLogout} className="text-[9px] text-zinc-600 uppercase font-black hover:text-red-500 transition-colors">
          Sair / Novo Cadastro
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full max-w-md animate-in fade-in duration-700">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black tracking-tighter text-white mb-2 italic">INSTITUTIONAL <span className="text-[#00f2ff] neon-text">ACCESS</span></h1>
        <p className="text-zinc-600 text-[10px] uppercase font-black tracking-[0.3em]">Expert Trading Terminal</p>
      </div>

      <div className="glass w-full rounded-[2.5rem] p-8 border border-zinc-800 shadow-2xl">
        {step === 'LOGIN' ? (
          <form className="space-y-6" onSubmit={(e) => checkApproval(e)}>
            <div>
              <label className="text-[10px] text-zinc-600 font-black uppercase tracking-widest block mb-3 pl-1">Identificação de Acesso</label>
              <input 
                type="text" 
                placeholder="Insira seu ID único..."
                className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-4 text-white text-sm focus:border-[#00f2ff] focus:outline-none transition-colors font-mono"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value.toUpperCase())}
              />
            </div>
            <button type="submit" className="w-full py-4 bg-[#00f2ff] text-black rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(0,242,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all">
              Acessar Terminal
            </button>
            <div className="text-center pt-2">
              <button type="button" onClick={() => setStep('REGISTER')} className="text-[10px] text-zinc-500 uppercase font-black hover:text-white transition-colors">
                Solicitar Novo Registro
              </button>
            </div>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={(e) => handleRegister(e)}>
            <div>
              <label className="text-[10px] text-zinc-600 font-black uppercase tracking-widest block mb-3 pl-1">E-mail para Cadastro</label>
              <input 
                required
                type="email" 
                placeholder="Seu e-mail..."
                className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-4 text-white text-sm focus:border-[#00f2ff] focus:outline-none transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full py-4 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-100 transition-all">
              Gerar ID Institucional
            </button>
            <div className="text-center pt-2">
              <button type="button" onClick={() => setStep('LOGIN')} className="text-[10px] text-zinc-500 uppercase font-black hover:text-white transition-colors">
                Já possui ID? Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// --- Componente Principal ---

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('trader_approved') === 'true';
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<TradeMode>('BINARIA');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'SETUP' | 'PROJECTION'>('SETUP');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveSessionRef = useRef<any>(null);

  const isWeekend = () => {
    const day = new Date().getUTCDay();
    return day === 0 || day === 6;
  };

  const handleLogout = () => {
    localStorage.removeItem('trader_id');
    localStorage.removeItem('trader_approved');
    window.location.href = window.location.origin + window.location.pathname;
  };

  const stopLiveMode = () => {
    if (liveSessionRef.current) {
      try { liveSessionRef.current.close(); } catch (e) {}
    }
    setIsLiveActive(false);
  };

  const startLiveMode = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      if (videoRef.current) { 
        videoRef.current.srcObject = stream; 
        videoRef.current.play(); 
      }
      setIsLiveActive(true);
    } catch (err) { 
      setError("Falha ao iniciar Livescreen."); 
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { 
        setPreviewUrl(reader.result as string); 
        setCurrentResult(null); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (mode === 'LIVE') return;
    setError(null);
    setIsAnalyzing(true);
    try {
      if (mode === 'RADOM' && isWeekend()) {
        throw new Error("Mercado Fechado. Scanner indisponível no final de semana.");
      }

      let res: AnalysisResult;
      if (mode === 'RADOM') {
        const scan = await scanMarketForSignals();
        res = { ...scan, timestamp: Date.now(), mode: 'RADOM', signal: scan.signal as any, entrySuggestion: scan.entry };
      } else {
        if (!previewUrl) throw new Error("Selecione um gráfico.");
        const analysis = await analyzeChart(previewUrl, mode);
        const predictionUrl = await predictContinuation(previewUrl, analysis.signal, analysis.market);
        
        res = { 
          ...analysis, 
          timestamp: Date.now(), 
          mode, 
          imagePreview: previewUrl, 
          predictionImageUrl: predictionUrl,
          signal: analysis.signal as any, 
          entrySuggestion: analysis.entry 
        };
      }
      setCurrentResult(res);
      setHistory(prev => [res, ...prev].slice(0, 10));
      setActiveTab('SETUP');
    } catch (err: any) {
      setError(err.message || "Análise indisponível.");
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
        <AuthScreen onAccessGranted={() => setIsAuthenticated(true)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black animate-in fade-in duration-1000">
      <header className="w-full max-w-6xl mb-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="text-center md:text-left">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white">
              ASSISTENTE <span className="text-[#00f2ff] neon-text italic">TRADER</span>
            </h1>
            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[9px] text-amber-500 font-black uppercase tracking-widest hidden md:block">Expert Mode v5.0</span>
          </div>
          <p className="text-zinc-500 font-mono text-[10px] lowercase tracking-[0.2em] opacity-80">created by: jovane garci</p>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-3 p-2 bg-zinc-950/80 rounded-2xl border border-zinc-800">
          {(['BINARIA', 'FOREX', 'LIVE', 'RADOM'] as TradeMode[]).map((m) => (
            <button 
              key={m} 
              onClick={() => { setMode(m); stopLiveMode(); setError(null); }} 
              className={`px-5 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase whitespace-nowrap ${mode === m ? 'bg-[#00f2ff] text-black shadow-[0_0_20px_rgba(0,242,255,0.4)] scale-105' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
            >
              {m === 'LIVE' ? 'Livescreen ⚡' : m === 'RADOM' ? 'Scanner 🎯' : m}
            </button>
          ))}
          <button onClick={handleLogout} className="px-5 py-3 text-zinc-700 hover:text-red-500 transition-colors text-[10px] font-black uppercase tracking-widest">
            Sair
          </button>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="glass rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-center gap-12 min-h-[480px] relative overflow-hidden shadow-2xl">
            <div className="flex flex-col items-center gap-6">
              <RobotIcon analyzing={isAnalyzing} alert={!!currentResult?.warning} />
              <div className="text-center">
                <h2 className="font-black text-2xl uppercase tracking-tighter text-white">{isAnalyzing ? 'Mestre Analisando...' : 'IA Expert Online'}</h2>
                <p className="text-zinc-500 text-sm mt-1">SMC & Price Action Master</p>
              </div>
            </div>
            <div className="w-full md:w-1/2 flex flex-col gap-4">
              {mode === 'LIVE' ? (
                <div className="w-full aspect-video rounded-3xl overflow-hidden border-2 bg-black transition-all border-zinc-800">
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                  {!isLiveActive && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6">
                      <button onClick={startLiveMode} className="px-8 py-4 bg-[#00f2ff] text-black rounded-2xl font-black text-xs uppercase shadow-2xl">Expert Livescreen</button>
                    </div>
                  )}
                </div>
              ) : mode === 'RADOM' ? (
                <div className="flex flex-col gap-4">
                  <button onClick={handleAnalyze} disabled={isAnalyzing} className={`w-full py-5 text-white rounded-2xl font-black uppercase shadow-2xl transition-all ${isWeekend() ? 'bg-zinc-800 cursor-not-allowed opacity-50' : 'bg-[#7000ff] hover:scale-105 active:scale-95'}`}>
                    {isWeekend() ? 'Mercado Fechado' : 'Scanner Institutional'}
                  </button>
                  {isWeekend() && <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest text-center animate-pulse">Inoperante no Final de Semana</p>}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div onClick={() => fileInputRef.current?.click()} className="relative w-full aspect-video rounded-[2rem] border-2 border-dashed border-zinc-800 hover:border-zinc-600 cursor-pointer flex items-center justify-center bg-zinc-950/30 overflow-hidden">
                    {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" /> : <div className="text-center p-8"><span className="text-zinc-600 font-black text-[10px] uppercase tracking-widest block mb-2">Upload Gráfico</span><span className="text-zinc-800 text-[9px] uppercase">Smart Money Concept</span></div>}
                  </div>
                  <button onClick={handleAnalyze} disabled={isAnalyzing || !previewUrl} className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl transition-all ${!previewUrl ? 'bg-zinc-800 text-zinc-600' : 'bg-white text-black hover:bg-zinc-100'}`}>
                    Análise Master
                  </button>
                </div>
              )}
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass rounded-[2.5rem] p-6 flex flex-col min-h-[520px] shadow-2xl relative transition-all overflow-hidden">
            {currentResult && (
              <div className="flex gap-2 mb-6 p-1 bg-zinc-950/60 rounded-xl border border-zinc-800">
                <button onClick={() => setActiveTab('SETUP')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${activeTab === 'SETUP' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>SETUP</button>
                <button onClick={() => setActiveTab('PROJECTION')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${activeTab === 'PROJECTION' ? 'bg-[#00f2ff] text-black' : 'text-zinc-600'}`}>PROJEÇÃO</button>
              </div>
            )}
            <div className="flex-grow flex flex-col items-center justify-center text-center">
              {currentResult ? (
                activeTab === 'SETUP' ? (
                  <div className="w-full animate-in slide-in-from-right duration-300">
                    <div className={`text-7xl font-black italic tracking-tighter mb-2 uppercase ${currentResult.signal === 'COMPRA' ? 'text-[#00f2ff] neon-text' : 'text-red-500'}`}>{currentResult.signal}</div>
                    <div className="text-[10px] text-[#00f2ff] font-bold uppercase tracking-[0.2em] mb-4">{currentResult.market || 'SPOT'}</div>
                    <div className="text-xl font-black text-white uppercase mb-4 leading-tight">{currentResult.entrySuggestion}</div>
                    {currentResult.warning && <p className="text-[10px] text-zinc-500 mb-6 italic leading-relaxed">"Obs: {currentResult.warning}"</p>}
                  </div>
                ) : (
                  <div className="w-full animate-in slide-in-from-left duration-300">
                    {currentResult.predictionImageUrl ? (
                      <div className="space-y-4">
                        <div className="rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl aspect-video bg-zinc-950">
                          <img src={currentResult.predictionImageUrl} className="w-full h-full object-cover" alt="Projection" />
                        </div>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Fluxo Institucional Previsto</p>
                      </div>
                    ) : (
                      <div className="p-8 text-zinc-700 text-[10px] uppercase font-black">Projeção indisponível</div>
                    )}
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full border border-zinc-800 border-t-[#00f2ff] animate-spin mx-auto opacity-20"></div>
                  <p className="text-zinc-700 text-[10px] uppercase font-black tracking-widest">Aguardando Gráfico...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {error && (
        <div className="fixed bottom-10 px-8 py-4 bg-red-600 text-white text-[10px] font-black rounded-full shadow-2xl z-50 animate-bounce uppercase tracking-widest border border-red-400/50">
          {error}
        </div>
      )}
    </div>
  );
};

export default App;
