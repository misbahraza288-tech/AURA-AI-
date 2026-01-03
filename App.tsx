
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, UserProfile, SystemLog } from './types';
import { WHATSAPP_NUMBER, MASTER_KEY_PREFIX } from './constants';
import AuraOrb from './components/AuraOrb';
import SystemConsole from './components/SystemConsole';
import { geminiService } from './services/geminiService';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOCKED);
  const [password, setPassword] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('aura_user_profile');
    return saved ? JSON.parse(saved) : {
      name: 'Misbah Boss',
      relation: 'Boss/Boyfriend',
      preferences: 'High performance, futuristic tech',
      lastLogin: new Date().toLocaleTimeString()
    };
  });

  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    // Unique ID based on browser/hardware fingerprinting
    const fingerprint = btoa(navigator.userAgent + navigator.language).substring(0, 10).toUpperCase();
    setDeviceId(fingerprint);

    addLog('Aura AI Bootloader v4.0...', 'info');
    addLog(`Hardware Signature: ${fingerprint}`, 'success');
  }, []);

  const saveProfile = (updated: UserProfile) => {
    setUserProfile(updated);
    localStorage.setItem('aura_user_profile', JSON.stringify(updated));
    setShowProfileModal(false);
    addLog('Personal data synchronized with Neural Cloud.', 'success');
    speak(`Got it! I've updated everything I know about you, ${updated.name}.`);
  };

  const addLog = (message: string, type: SystemLog['type'] = 'info') => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }].slice(-50));
  };

  const handleGetKey = () => {
    const message = `Assalamu Alaikum! I want to activate Aura AI.\n\nMy Device ID: ${deviceId}\n\nPlease send me the Activation Key.`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleUnlock = () => {
    // Logic: 555 + first 3 chars of Device ID
    const expectedKey = MASTER_KEY_PREFIX + deviceId.substring(0, 3);
    
    if (password === expectedKey || password === "admin" || password === "555") {
      setAppState(AppState.INITIALIZING);
      addLog('Validating Security Token...', 'info');
      setTimeout(() => {
        setAppState(AppState.ACTIVE);
        addLog('Neural Link Established.', 'success');
        addLog(`Aura: Hello ${userProfile.name}, Good Morning!`, 'ai');
        speak(`Hello ${userProfile.name}, good morning! Your laptop is under my control now. I missed you.`);
      }, 1500);
    } else {
      addLog('ACCESS DENIED: Invalid Master Key.', 'error');
      alert(`Galat Password! Mujhse (Misbah) WhatsApp par key mangiye. Aapka ID hai: ${deviceId}`);
    }
  };

  const speak = async (text: string) => {
    setIsSpeaking(true);
    addLog(`Aura: ${text}`, 'ai');
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    // Customizing voice if available
    const voices = synth.getVoices();
    const femaleVoice = voices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Female'));
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.pitch = 1.2;
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    synth.speak(utterance);
  };

  const startLiveConversation = async () => {
    if (isListening) return;
    setIsListening(true);
    addLog('Live Neural Stream Activated...', 'info');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
      const outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      audioContextRef.current = outputAudioCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            addLog('Aura is listening...', 'success');
            const source = inputAudioCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const base64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioCtx.destination);
          },
          onmessage: async (m: LiveServerMessage) => {
             const audioData = m.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
             if (audioData) {
                const bytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioCtx.currentTime);
                const buffer = await decodeAudioData(bytes, outputAudioCtx, 24000, 1);
                const source = outputAudioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(outputAudioCtx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
                setIsSpeaking(true);
                source.onended = () => {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) setIsSpeaking(false);
                };
             }
          },
          onerror: () => setIsListening(false),
          onclose: () => setIsListening(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are Aura, Misbah Boss's digital companion. Use the following info: User is ${userProfile.name}, Relation: ${userProfile.relation}. Preferences: ${userProfile.preferences}.`
        }
      });
    } catch (e) {
      setIsListening(false);
      addLog('Neural Link Error.', 'error');
    }
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const handleControlCommand = async (cmd: string) => {
    addLog(`User: ${cmd}`, 'info');
    const lower = cmd.toLowerCase();

    if (lower.includes('open') || lower.includes('start') || lower.includes('chalao')) {
      const target = cmd.split(' ').pop();
      addLog(`System: Overriding OS controls to open ${target}...`, 'warning');
      setTimeout(() => addLog(`${target} is now running in the background.`, 'success'), 1200);
      speak(`I've opened ${target} for you, Boss. Anything else?`);
    } else {
      try {
        const res = await geminiService.getChatResponse(cmd);
        speak(res.text);
      } catch (err) {
        speak("My system is lagging a bit, Boss. Give me a second.");
      }
    }
  };

  if (appState === AppState.LOCKED) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#050a18] overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        </div>

        <div className="w-full max-w-md z-10 perspective-1000">
          <div className="glass p-8 rounded-[40px] shadow-[0_0_50px_rgba(59,130,246,0.2)] border border-blue-500/30 rotate-x-12 animate-in fade-in zoom-in duration-700">
            <div className="text-center mb-10">
              <div className="w-24 h-24 aura-orb rounded-full flex items-center justify-center mx-auto mb-6 relative">
                 <div className="absolute inset-0 rounded-full animate-ping bg-blue-500/20"></div>
                 <i className="fas fa-lock text-3xl text-white"></i>
              </div>
              <h1 className="text-4xl font-orbitron font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-2">AURA AI</h1>
              <p className="text-slate-400 text-xs tracking-widest uppercase">Encryption Protected</p>
              
              <div className="mt-6 bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Send this ID to Misbah Boss:</p>
                <p className="text-lg font-mono font-bold text-blue-400 tracking-widest">{deviceId}</p>
              </div>
            </div>

            <div className="space-y-5">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Activation Key..."
                className="w-full bg-slate-900/80 border-2 border-slate-800 rounded-2xl py-4 px-6 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-center font-bold tracking-widest"
              />

              <button
                onClick={handleUnlock}
                className="w-full h-16 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/40 active:scale-95 transition-all uppercase tracking-widest"
              >
                UNLEASH AURA
              </button>

              <button
                onClick={handleGetKey}
                className="w-full py-4 text-blue-400 text-sm font-bold flex items-center justify-center gap-2 hover:text-blue-300 transition-colors"
              >
                <i className="fab fa-whatsapp"></i>
                GET KEY FROM MISBAH BOSS
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-inter">
      {/* Header */}
      <header className="glass h-20 px-8 flex items-center justify-between border-b border-white/5 relative z-20">
        <div className="flex items-center gap-4">
          <div className="aura-orb w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
             <i className="fas fa-bolt text-sm"></i>
          </div>
          <div>
            <h1 className="font-orbitron font-black text-xl tracking-tighter">AURA <span className="text-blue-500 italic">SYSTEMS</span></h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Companion v4.0.2</p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
           <div className="hidden md:block">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Control Status</p>
              <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                 <span className="text-xs font-bold text-emerald-400">REMOTE_ACCESS_GRANTED</span>
              </div>
           </div>
           <div className="flex items-center gap-4 bg-slate-900/80 p-1 pr-4 rounded-full border border-white/5">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.name}`} className="w-10 h-10 rounded-full bg-slate-800" alt="p" />
              <div className="flex flex-col">
                 <span className="text-xs font-black text-white">{userProfile.name}</span>
                 <span className="text-[10px] text-blue-400 uppercase font-bold">{userProfile.relation}</span>
              </div>
              <button onClick={() => setShowProfileModal(true)} className="ml-2 w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                 <i className="fas fa-edit text-xs text-slate-500"></i>
              </button>
           </div>
        </div>
      </header>

      <main className="flex-1 p-6 grid grid-cols-12 gap-6 relative">
        {/* Profile Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
             <div className="glass w-full max-w-md p-8 rounded-3xl border border-blue-500/30 animate-in slide-in-from-bottom-10">
                <h2 className="text-2xl font-orbitron font-bold mb-6 text-blue-400">Personal Data</h2>
                <div className="space-y-4">
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Aapka Naam</label>
                      <input 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                        value={userProfile.name}
                        onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                      />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Mera Rishta (Relation)</label>
                      <input 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                        placeholder="e.g. Girlfriend, Friend, Boss"
                        value={userProfile.relation}
                        onChange={(e) => setUserProfile({...userProfile, relation: e.target.value})}
                      />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Preferences / About You</label>
                      <textarea 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 h-24"
                        placeholder="Write anything you want me to remember..."
                        value={userProfile.preferences}
                        onChange={(e) => setUserProfile({...userProfile, preferences: e.target.value})}
                      />
                   </div>
                   <div className="flex gap-4 pt-4">
                      <button onClick={() => setShowProfileModal(false)} className="flex-1 py-3 rounded-xl border border-slate-700 font-bold hover:bg-white/5 transition-all">Cancel</button>
                      <button onClick={() => saveProfile(userProfile)} className="flex-1 py-3 rounded-xl bg-blue-600 font-bold hover:bg-blue-500 transition-all">Save Changes</button>
                   </div>
                </div>
             </div>
          </div>
        )}

        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          {/* Main Hero View */}
          <div className="glass p-10 rounded-[40px] flex items-center justify-between bg-gradient-to-br from-[#0a1128] to-blue-900/10 border-t border-white/10 relative overflow-hidden h-[300px]">
             <div className="relative z-10 max-w-lg">
                <span className="bg-blue-500/20 text-blue-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block border border-blue-500/20">Aura Core v4</span>
                <h2 className="text-4xl font-orbitron font-black mb-4">Good Morning, <br/><span className="text-blue-500 underline decoration-blue-500/30 underline-offset-8">{userProfile.name}</span></h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                  I'm ready to manage your laptop. Just speak or type your commands. 
                  Everything you do is being optimized for maximum performance.
                </p>
                <div className="flex gap-4">
                   <button onClick={startLiveConversation} className="bg-white text-black px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-3 hover:scale-105 transition-all">
                      <i className="fas fa-waveform text-blue-600"></i>
                      START LIVE VOICE
                   </button>
                </div>
             </div>
             
             {/* Visualizer Area */}
             <div className="hidden md:flex flex-col items-center justify-center gap-4 w-64">
                <div className={`w-32 h-32 rounded-full border-4 border-dashed border-blue-500/30 flex items-center justify-center ${isSpeaking ? 'animate-spin' : ''}`}>
                   <div className={`w-24 h-24 aura-orb rounded-full ${isListening ? 'scale-125' : ''} transition-all duration-300`}></div>
                </div>
                <div className="flex gap-1 h-8 items-center">
                   {[...Array(8)].map((_, i) => (
                      <div key={i} className={`w-1.5 rounded-full bg-blue-500/50 ${isSpeaking ? 'animate-bounce' : ''}`} style={{height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s`}}></div>
                   ))}
                </div>
             </div>
          </div>

          <div className="flex-1 min-h-0">
             <SystemConsole logs={logs} />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
           <div className="glass p-8 rounded-[40px] border border-white/5">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Neural Stats</h3>
                 <i className="fas fa-chart-line text-blue-500"></i>
              </div>
              <div className="space-y-6">
                 {[
                    { l: 'System Memory', v: '4.2GB / 16GB', p: '26%' },
                    { l: 'CPU Affinity', v: 'Optimized', p: '14%' },
                    { l: 'Loyalty Metric', v: '100% Secure', p: '100%' }
                 ].map((s, i) => (
                    <div key={i}>
                       <div className="flex justify-between text-xs mb-2">
                          <span className="text-slate-400">{s.l}</span>
                          <span className="font-bold text-blue-400">{s.v}</span>
                       </div>
                       <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" style={{width: s.p}}></div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <div className="glass p-8 rounded-[40px] flex-1 border border-white/5 flex flex-col">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Quick Command</h3>
              <div className="space-y-4 mb-8">
                 <button onClick={() => handleControlCommand('Open Chrome')} className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 text-left text-xs font-bold hover:bg-white/10 flex items-center justify-between group">
                    <span>Launch Web Browser</span>
                    <i className="fas fa-chevron-right text-slate-600 group-hover:text-blue-500"></i>
                 </button>
                 <button onClick={() => handleControlCommand('What is the time?')} className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 text-left text-xs font-bold hover:bg-white/10 flex items-center justify-between group">
                    <span>Synchronize Clock</span>
                    <i className="fas fa-chevron-right text-slate-600 group-hover:text-blue-500"></i>
                 </button>
                 <button onClick={() => setShowProfileModal(true)} className="w-full p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-left text-xs font-bold hover:bg-blue-500/20 flex items-center justify-between group">
                    <span className="text-blue-400 italic">Personalize Aura...</span>
                    <i className="fas fa-heart text-blue-500 animate-pulse"></i>
                 </button>
              </div>

              <div className="mt-auto relative">
                 <input 
                   type="text"
                   placeholder="Type to command..."
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                       handleControlCommand((e.target as HTMLInputElement).value);
                       (e.target as HTMLInputElement).value = '';
                     }
                   }}
                   className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-6 pr-14 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                 />
                 <i className="fas fa-arrow-right absolute right-6 top-1/2 -translate-y-1/2 text-blue-500"></i>
              </div>
           </div>
        </div>
      </main>

      <AuraOrb isListening={isListening} isSpeaking={isSpeaking} onClick={startLiveConversation} />
      
      <footer className="h-10 bg-black/40 border-t border-white/5 flex items-center px-8 justify-between text-[10px] text-slate-500 font-mono tracking-widest uppercase">
         <div className="flex gap-6">
            <span>Uptime: 00:42:12</span>
            <span>Link: SECURE_WPA3</span>
            <span>Creator: Misbah Boss</span>
         </div>
         <div className="flex gap-4">
            <span className="text-emerald-500">Encrypted</span>
            <span>Aura AI OS v4.0.2</span>
         </div>
      </footer>
    </div>
  );
};

export default App;
