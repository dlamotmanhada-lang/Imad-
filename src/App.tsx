import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Volume2, ArrowRight, Quote, Shield, Zap, TrendingUp } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { narrative, NarrativePart } from './constants';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  // Play the specific part voice
  const playAzouzVoice = async (text: string) => {
    try {
      setIsGeneratingAudio(true);
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ 
          parts: [{ 
            text: `Speak as Azouz, a street-hardened Moroccan man with a deep, rasping and wise voice. Speak with grit and emotion: ${text}` 
          }] 
        }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Fenrir' }, // Deep voice
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        // Convert to PCM 24k
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        // We need raw PCM to reach the user, but since the SDK returns base64, 
        // we normally need AudioContext. Let's try to wrap it in a WAV for easier playback if possible,
        // but given the skill says "decode and play audio with sample rate 24000", 
        // I'll use a direct source buffer or similar.
        // Actually, for simplicity and reliability in the browser, I'll use the Web Audio API.
        
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const floatData = new Float32Array(bytes.length / 2);
        const intView = new Int16Array(bytes.buffer);
        for (let i = 0; i < intView.length; i++) {
          floatData[i] = intView[i] / 32768.0;
        }

        const buffer = audioCtx.createBuffer(1, floatData.length, 24000);
        buffer.getChannelData(0).set(floatData);
        
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start();
        
        source.onended = () => {
          setIsGeneratingAudio(false);
        };
      } else {
        setIsGeneratingAudio(false);
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setIsGeneratingAudio(false);
    }
  };

  const startNarrative = () => {
    setIsPlaying(true);
    setCurrentIndex(0);
  };

  const resetNarrative = () => {
    setIsPlaying(false);
    setCurrentIndex(-1);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (isPlaying && currentIndex < narrative.length - 1) {
      const nextPart = narrative[currentIndex + 1];
      const delay = (nextPart.seconds - (narrative[currentIndex]?.seconds || 0)) * 1000;
      
      timerRef.current = window.setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, delay);
    } else if (currentIndex === narrative.length - 1) {
      setIsPlaying(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex]);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white selection:text-black">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 opacity-40 grayscale"
          style={{ 
            backgroundImage: `url('https://picsum.photos/seed/urban-night-0921/1920/1080?grayscale')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505] opacity-80" />
      </div>

      {/* Main Layout */}
      <main className="relative z-10 container mx-auto px-6 py-20 min-h-screen flex flex-col justify-center">
        <header className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <span className="font-mono text-xs tracking-widest text-zinc-500 uppercase">A Story by Azouz</span>
            <div className="h-[1px] w-12 bg-zinc-800" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-7xl md:text-9xl font-display uppercase leading-[0.8] tracking-tighter"
          >
            Zenqa <br />
            <span className="text-zinc-600">to</span> Qimma
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-zinc-400 max-w-md font-mono text-sm leading-relaxed"
          >
            ضحكو عليا... دابا كاملين كيسمعوني. 
            A journey from the gritty streets of Morocco to the absolute peak of success.
          </motion.p>
        </header>

        {/* Narrative Section */}
        <section className="relative min-h-[400px] flex flex-col items-start justify-center">
          {currentIndex === -1 ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startNarrative}
              className="group flex items-center gap-6 text-2xl font-display uppercase brutal-border px-10 py-6 hover:bg-white hover:text-black transition-all duration-300"
            >
              Start Journey <ArrowRight className="group-hover:translate-x-2 transition-transform" />
            </motion.button>
          ) : (
            <div className="w-full max-w-4xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ duration: 0.8, ease: "circOut" }}
                  className="space-y-8"
                >
                  <div className="flex items-start gap-6">
                    <Quote className="text-zinc-700 w-12 h-12 shrink-0 -mt-2" />
                    <div>
                      <h2 className="text-4xl md:text-6xl font-arabic font-bold text-gradient leading-tight">
                        {narrative[currentIndex].text}
                      </h2>
                      <p className="mt-6 text-zinc-600 font-mono text-lg italic">
                        "{narrative[currentIndex].translation}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-12">
                    <button 
                      onClick={() => playAzouzVoice(narrative[currentIndex].text)}
                      disabled={isGeneratingAudio}
                      className="p-4 rounded-full brutal-border hover:bg-white hover:text-black transition-colors disabled:opacity-30"
                    >
                      {isGeneratingAudio ? <Zap className="animate-pulse" /> : <Volume2 />}
                    </button>
                    <div className="h-[1px] flex-grow bg-zinc-900 overflow-hidden">
                      <motion.div 
                        className="h-full bg-white"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 5, ease: "linear" }}
                      />
                    </div>
                    <span className="font-mono text-xs text-zinc-500">{narrative[currentIndex].timestamp}</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Global Controls */}
        <div className="fixed bottom-10 right-10 flex gap-4">
          {currentIndex !== -1 && (
            <>
              <button 
                onClick={resetNarrative}
                className="p-4 glass-panel hover:bg-white/10 transition-colors"
                title="Reset"
              >
                <RotateCcw className="w-5 h-5 text-zinc-400" />
              </button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-4 glass-panel hover:bg-white/10 transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
            </>
          )}
        </div>

        {/* Side Progress */}
        <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-none opacity-20 hidden md:flex">
          {narrative.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 w-6 transition-all duration-500 ${i <= currentIndex ? 'bg-white w-12' : 'bg-zinc-800'}`} 
            />
          ))}
        </div>
      </main>

      {/* Decorative Branding */}
      <div className="fixed top-10 right-10 pointer-events-none overflow-hidden">
         <motion.div 
           initial={{ rotate: 90 }}
           className="text-zinc-500 font-mono text-[10px] tracking-[0.5em] uppercase whitespace-nowrap"
           style={{ transformOrigin: 'top right' }}
         >
           00_AZOUZ_NARRATIVE_SYSTEM_V.1
         </motion.div>
      </div>

      {/* Bottom Grid Decor */}
      <div className="fixed inset-x-0 bottom-0 h-40 pointer-events-none opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Narrative Footer */}
      {currentIndex === narrative.length - 1 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-6"
        >
          <div className="text-center max-w-2xl">
            <h2 className="text-6xl font-display uppercase mb-8">Arrival</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
               <div className="glass-panel p-6">
                 <Shield className="w-8 h-8 mb-4 mx-auto text-zinc-500" />
                 <h3 className="font-mono text-xs uppercase mb-2">Resilience</h3>
                 <p className="text-sm text-zinc-400">Survival is the foundation of growth.</p>
               </div>
               <div className="glass-panel p-6">
                 <Zap className="w-8 h-8 mb-4 mx-auto text-zinc-500" />
                 <h3 className="font-mono text-xs uppercase mb-2">Power</h3>
                 <p className="text-sm text-zinc-400">Silence fuels the ultimate explosion.</p>
               </div>
               <div className="glass-panel p-6">
                 <TrendingUp className="w-8 h-8 mb-4 mx-auto text-zinc-500" />
                 <h3 className="font-mono text-xs uppercase mb-2">Summit</h3>
                 <p className="text-sm text-zinc-400">Success is the only loud answer.</p>
               </div>
            </div>
            <button 
              onClick={resetNarrative}
              className="text-xl font-display uppercase brutal-border px-8 py-4 hover:bg-white hover:text-black transition-all"
            >
              Replay Journey
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
