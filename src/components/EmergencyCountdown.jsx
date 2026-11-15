import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendSMSAlerts, autoCallEmergency, sequentialAutoCall, sendNotification, vibrateDevice, stopVibration, loadSettings, acknowledgeImpact, abortFailsafe } from '../services/emergency';
import { uploadEvidence } from '../services/upload';
import AppLogoInner from './AppLogo';
import { getLanguageConfig } from '../config/languages';
import HospitalEmergencyOverlay from './HospitalEmergencyOverlay';
import { logIncident } from '../services/history';
import { saveIncident } from '../services/storage';
import './EmergencyCountdown.css';

const generateIncidentId = () => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `accident_${date}_${time}`;
};

const playSiren = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'square';
    
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.setValueAtTime(800, now + 0.5);
    osc.frequency.setValueAtTime(1000, now + 1.0);
    osc.frequency.setValueAtTime(800, now + 1.5);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gain.gain.setValueAtTime(0.2, now + 1.9);
    gain.gain.linearRampToValueAtTime(0, now + 2.0);
    
    osc.start(now);
    osc.stop(now + 2.0);
  } catch (e) {
    console.warn("Siren audio blocked by browser:", e);
  }
};

const SAFE_KEYWORDS = [
  "ok", "okay", "i am ok", "i'm ok", "i am fine", "i'm fine", "fine",
  "i am safe", "i'm safe", "safe", "all good", "everything is fine",
  "cancel", "cancel alert", "no accident", "accident nahi", "nahi hua",
  "main thik hu", "mai thik hu", "mein thik hu", "haan thik hu",
  "thik hu", "theek hu", "sab thik hai", "sab theek hai",
  "haan", "ha", "yes", "yep", "yup", "stop", "abort"
];

const DANGER_WORDS = [
  "help", "bachao", "madad", "save me", "emergency", "sos"
];

export default function EmergencyCountdown({ active, duration = 10, position, aiAnalysis, onCancel, onAlertSent }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [alertSent, setAlertSent] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [evidenceLink, setEvidenceLink] = useState(null);
  const [voiceError, setVoiceError] = useState('');
  
  // NATIVE FAILSAFE COORDINATION
  useEffect(() => {
    if (active) {
        acknowledgeImpact();
    }
    return () => {
        // Always try to abort failsafe on unmount to be safe
        abortFailsafe();
    };
  }, [active]);

  const langCode = localStorage.getItem('preferredLanguage') || 'en-IN';
  const langConfig = getLanguageConfig(langCode);

  const intervalRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  // Ref-based flags to avoid stale closures
  const isActiveRef = useRef(false);
  const alertSentRef = useRef(false);
  const onCancelRef = useRef(onCancel);
  const onAlertSentRef = useRef(onAlertSent);
  const triggerAlertRef = useRef(null);
  const timeLeftRef = useRef(duration); // always holds the live remaining seconds
  
  // Media Capture Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const incidentIdRef = useRef(null);
  const [captureStatus, setCaptureStatus] = useState(null); // 'recording', 'ready', 'failed'

  // Keep refs in sync
  useEffect(() => { 
    isActiveRef.current = active; 
  }, [active]);
  
  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);
  useEffect(() => { onAlertSentRef.current = onAlertSent; }, [onAlertSent]);
  // Mirror timeLeft into a ref so triggerAlert can read it without stale closure
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  // Build recognition once and keep it alive with auto-restart
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('not-supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = 'en-IN'; // broadest recognition

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError('');
    };

    // Auto-restart if still active (handles Chrome's 60s limit & silence stop)
    recognition.onend = () => {
      setIsListening(false);
      if (isActiveRef.current && !alertSentRef.current) {
        try { recognition.start(); } catch (_) {}
      }
    };

    recognition.onerror = (e) => {
      console.error('[Voice] error:', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setVoiceError('denied');
        return; 
      }
      // Attempt restart on non-fatal errors
      if (isActiveRef.current && !alertSentRef.current) {
        setTimeout(() => {
          try { recognition.start(); } catch (_) {}
        }, 1000);
      }
    };

    recognition.onresult = (event) => {
      let current = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        current += event.results[i][0].transcript;
      }
      const clean = current.toLowerCase().replace(/[^\w\s]/gi, '');
      console.log('[Voice] Transcript:', clean);
      setTranscript(clean);

      // Inline keyword check against refs to avoid stale state
      if (!isActiveRef.current || alertSentRef.current) return;

      const isDanger = DANGER_WORDS.some(w => clean.includes(w));
      if (isDanger) {
        console.log('[Voice] Danger word detected. Fast-forwarding timer to 0.');
        try { recognition.stop(); } catch (_) {}
        setTimeLeft(0);
        return;
      }

      const isSafe = SAFE_KEYWORDS.some(w => clean.includes(w)) || clean.includes('stop') || clean.includes('abort');
      if (isSafe || clean.length >= 2 && (clean.includes('ok') || clean.includes('thik'))) {
        console.log('[Voice] Safe-word/interim-match detected → cancelling alert');
        try { recognition.stop(); } catch (_) {}
        abortFailsafe(); // Native sync
        isActiveRef.current = false;
        onCancelRef.current();
      }
    };

    recognitionRef.current = recognition;

    // Sequential initialization to prevent hardware lock
    const startTimeout = setTimeout(() => {
        if (isActiveRef.current) {
            try { recognition.start(); } catch(e) { console.error('Voice start failed:', e); }
        }
    }, 500);

    return () => {
      clearTimeout(startTimeout);
      try { recognition.stop(); } catch (_) {}
    };
  }, []);

  // --- VOLUME FALLBACK (Shout to Abort) ---
  useEffect(() => {
    if (!streamRef.current || !active) return;

    let audioCtx = null;
    let analyzer = null;
    let source = null;
    let animationId = null;

    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        analyzer = audioCtx.createAnalyser();
        source = audioCtx.createMediaStreamSource(streamRef.current);
        source.connect(analyzer);
        analyzer.fftSize = 256;

        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          if (!isActiveRef.current) return;
          analyzer.getByteFrequencyData(dataArray);
          
          // PEAK DETECTION: Faster than average-based sensing
          let peak = 0;
          for (let i = 0; i < bufferLength; i++) {
            if (dataArray[i] > peak) peak = dataArray[i];
          }
          
          const normalized = peak / 255; // 0 to 1 range
          setVolumeLevel(normalized);

          // SHOUT DETECTION: If user shouts (loud noise), abort the alert instantly
          // Threshold re-tuned for peaks (0.85 is a very loud shout)
          if (normalized > 0.85) {
            console.log('[Voice] Peak shout detected! Aborting alert.');
            abortFailsafe(); // Native sync
            isActiveRef.current = false;
            onCancelRef.current();
            return; // stop loop
          }
          animationId = requestAnimationFrame(checkVolume);
        };
        checkVolume();
    } catch (e) {
        console.warn('[Voice] Volume fallback initialization failed:', e);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioCtx) audioCtx.close();
    };
  }, [active]);

  // --- MEDIA CAPTURE LOGIC ---
  const startMediaCapture = useCallback(async () => {
    try {
      setCaptureStatus('recording');
      incidentIdRef.current = generateIncidentId();
      let currentPhoto = null;

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // 1. Capture Photo Snapshot immediately
      setTimeout(() => {
        if (canvasRef.current && videoRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0);
          currentPhoto = canvasRef.current.toDataURL('image/jpeg');
          localStorage.setItem('last_accident_photo', currentPhoto);
          
          // Auto-export to Native Gallery
          import('../services/mediaExport').then(({ exportPhotoToGallery }) => {
            exportPhotoToGallery(currentPhoto, `${incidentIdRef.current}_photo.jpg`);
          });
        }
      }, 1000);

      // 2. Start Video Recording
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 1500000 });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        localStorage.setItem('last_accident_video_url', url); // Still keep for immediate UI
        
        try {
          // Persist a full Incident Record to IndexedDB
          const record = {
            id: incidentIdRef.current,
            video: blob,
            photo: currentPhoto,
            timestamp: Date.now(),
            metadata: {
                lat: position?.latitude,
                lng: position?.longitude,
                severity: aiAnalysis?.classification || 'Unknown',
                confidence: aiAnalysis?.confidence || 0
            }
          };
          await saveIncident(record);
          console.log(`[Media] Incident ${record.id} persisted to IndexedDB.`);
        } catch (e) {
          console.error('[Media] Persistence failed:', e);
        }

        // 3. Upload for Sharing
        try {
          console.log('[Upload] Starting evidence upload for sharing...');
          const link = await uploadEvidence(blob, `${incidentIdRef.current}.webm`);
          if (link) {
            setEvidenceLink(link);
            console.log('[Upload] Link ready for SMS:', link);
          }
        } catch (err) {
          console.warn('[Upload] Sharing failed:', err);
        }
        
        setCaptureStatus('ready');
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

    } catch (err) {
      console.error('[Media] Capture failed:', err);
      setCaptureStatus('failed');
    }
  }, [position, aiAnalysis]);

  const stopMediaCapture = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const triggerAlert = useCallback(async () => {
    // PROTECT: Ensure alerts are executed ONLY once
    if (alertSentRef.current) return;
    
    // 1. Stop Native Failsafe and set triggered state
    abortFailsafe();
    acknowledgeImpact();
    alertSentRef.current = true;
    setAlertSent(true);
    
    console.log("Countdown finished. Releasing media and preparing dispatch...");
    isActiveRef.current = false;
    stopVibration();

    try { recognitionRef.current?.abort(); } catch (_) {}
    if (synthRef.current) synthRef.current.cancel();

    // 2. STOP RECORDING IMMEDIATELY to finalize the video file
    stopMediaCapture();

    // 3. WAIT PERIOD: Give the video a moment to finalize and upload (max 5s)
    // We check every 500ms if the evidenceLink state has been populated
    console.log("[Alert] Waiting for evidence link...");
    let waitIter = 0;
    while (!evidenceLink && waitIter < 10) { // 10 * 500ms = 5s max wait
        await new Promise(r => setTimeout(r, 500));
        waitIter++;
    }

    // 4. SEND ALERTS (with link if ready, without if timed out)
    console.log(`[Alert] Dispatching SMS (Link ready: ${!!evidenceLink})`);
    const sent = await sendSMSAlerts(position, evidenceLink);
    sendNotification('🚨 Accident Detected!', 'Emergency alerts triggered. Help is on the way.');
    
    // 5. CALL SEQUENCE
    // Schedule first call with a small buffer
    sequentialAutoCall(25, 3).catch(err => console.error('[SOS Call chain error]', err));
    
    if (onAlertSentRef.current) onAlertSentRef.current(sent);
  }, [position, evidenceLink, stopMediaCapture]);

  // Keep triggerAlert accessible inside recognition.onresult via ref
  useEffect(() => { triggerAlertRef.current = triggerAlert; }, [triggerAlert]);

  const handleCancel = useCallback(() => {
    console.log("User cancelled alert. Stopping timer.");
    isActiveRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    if (!alertSentRef.current) {
      logIncident({ lat: position?.latitude, lng: position?.longitude, status: 'False Alarm - Aborted by Pilot' });
    }
    stopMediaCapture();
    try { recognitionRef.current?.abort(); } catch (_) {}
    if (synthRef.current) synthRef.current.cancel();
    onCancelRef.current();
  }, [position, stopMediaCapture]);

  // MAIN SEQUENCE: Manage countdown lifecycle
  useEffect(() => {
    if (!active) {
      isActiveRef.current = false;
      alertSentRef.current = false;
      setAlertSent(false);
      setTranscript('');
      stopVibration();
      stopMediaCapture();
      if (intervalRef.current) clearInterval(intervalRef.current);
      try { recognitionRef.current?.abort(); } catch (_) {}
      if (synthRef.current) synthRef.current.cancel();
      return;
    }

    // --- CRASH DETECTED ---
    console.log("Crash detected. Countdown started.");
    
    isActiveRef.current = true;
    alertSentRef.current = false;
    setAlertSent(false);
    setTimeLeft(duration); // Start at the correct duration
    setTranscript('');

    vibrateDevice([500, 200, 500, 200, 500, 200, 500]);
    playSiren();
    startMediaCapture(); // Start Blackbox recording


    // Start mic (0.5s delay to let siren initial blare start)
    const micStartTimer = setTimeout(() => {
      if (isActiveRef.current && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) {}
      }
    }, 500);

    // TTS Prompt
    const ttsTimer = setTimeout(() => {
      if (synthRef.current && isActiveRef.current) {
        synthRef.current.cancel();
        const utterance = new SpeechSynthesisUtterance(langConfig.ttsPrompt || 'Accident detected.');
        utterance.lang = langConfig.code || 'en-IN';
        synthRef.current.speak(utterance);
      }
    }, 800);

    // Standard Countdown Timer
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { 
           clearInterval(intervalRef.current); 
           return 0; 
        }
        if (prev % 2 === 0) vibrateDevice([400, 100, 400]);
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(micStartTimer);
      clearTimeout(ttsTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopVibration();
      stopMediaCapture();
      try { recognitionRef.current?.abort(); } catch (_) {}
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [active, startMediaCapture, stopMediaCapture]); // Only re-run when activation status changes, NOT on every duration/config flick

  // COMPLETION BLOCK: Fire alerts only when timer reaches exactly 0
  useEffect(() => {
    if (timeLeft === 0 && active && !alertSentRef.current) {
      triggerAlert();
    }
  }, [timeLeft, active, triggerAlert]);

  if (!active) return null;

  if (alertSent) {
    return <HospitalEmergencyOverlay position={position} onDone={handleCancel} />;
  }

  return (
    <div className="alert-overlay">
      <div className="alert-background-flash" />

      <motion.div
        className="alert-container"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.1 }}
      >
        <div className="alert-header">
          <div className="warning-icon-wrapper">
            <span className="warning-icon">⚠️</span>
            <div className="warning-pulse" />
          </div>
          <h1 className="alert-title">Accident Detected!</h1>
          <p className="alert-subtitle">
            {aiAnalysis ? `AI Classification: ${aiAnalysis.classification}` : 'System identified a high-impact collision'}
          </p>
          {aiAnalysis && (
            <div className="ai-confidence-badge">
              Confidence: {aiAnalysis.confidence}%
            </div>
          )}
        </div>

        <div className="countdown-section">
          <div className="countdown-circle">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" className="circle-bg" />
              <motion.circle
                cx="50" cy="50" r="45"
                className="circle-progress"
                initial={{ pathLength: 1 }}
                animate={{ pathLength: timeLeft / duration }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </svg>
            <div className="countdown-number">{timeLeft}</div>
          </div>

          {/* Evidence Capture Status */}
          <div className={`media-badge ${captureStatus}`}>
            {captureStatus === 'recording' ? (
              <><span className="rec-dot" /> Evidence Logging Active</>
            ) : captureStatus === 'ready' ? (
              <><span className="check-icon">✔</span> Evidence Locked</>
            ) : captureStatus === 'failed' ? (
              <><span className="fail-icon">✕</span> Capture Offline</>
            ) : null}
          </div>

          {/* Voice Check Indicator */}
          <div className={`voice-indicator ${isListening ? 'listening' : ''} ${voiceError ? 'error' : ''}`}>
             <span className="mic-pulse" style={{ transform: `scale(${1 + volumeLevel * 0.5})` }}>
                {voiceError ? '📵' : isListening ? '🎙️' : '⏳'}
             </span>
             {voiceError === 'denied' ? 'Mic Access Denied' : 
              voiceError === 'not-supported' ? 'Voice Not Supported' :
              isListening ? 'Listening for "I AM OK" or SHOUT to abort' : 'Initializing Mic...'}
          </div>

          {transcript && (
            <div className="speech-transcript">🗣 "{transcript}"</div>
          )}

          <div className="alert-actions">
            <motion.button
              className="btn-safe"
              onClick={handleCancel}
              whileTap={{ scale: 0.95 }}
            >
              ✋ I AM SAFE
            </motion.button>

            <motion.button
              className="btn-sos-trigger"
              onClick={() => {
                console.log("SOS NOW pressed. Fast-forwarding timer to 0.");
                setTimeLeft(0);
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              🚨 SOS NOW
            </motion.button>
          </div>
        </div>
      </motion.div>

      <style>{`
        .alert-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 14, 26, 0.95);
          backdrop-filter: blur(20px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .alert-background-flash {
          position: absolute;
          inset: 0;
          background: rgba(255, 0, 0, 0.85);
          animation: strobe-bg 0.6s infinite alternate ease-in-out;
        }
        @keyframes strobe-bg {
          0% { opacity: 0.1; background: rgba(255, 0, 0, 0.4); }
          100% { opacity: 0.8; background: rgba(255, 0, 0, 0.9); }
        }
        .alert-container {
          width: 90%;
          max-width: 400px;
          text-align: center;
          z-index: 10;
        }
        .alert-header {
          margin-bottom: 3rem;
        }
        .warning-icon-wrapper {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: var(--alert-red);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 40px rgba(255, 59, 59, 0.5);
        }
        .warning-icon {
          font-size: 2.5rem;
          z-index: 2;
        }
        .warning-pulse {
          position: absolute;
          inset: -10px;
          border: 4px solid var(--alert-red);
          border-radius: 50%;
          animation: pulse-ring 1.5s infinite;
        }
        .alert-title {
          font-size: 2rem;
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.02em;
          margin-bottom: 0.5rem;
        }
        .alert-subtitle {
          color: var(--text-low);
          font-size: 0.9rem;
        }
        .ai-confidence-badge {
          display: inline-block;
          margin-top: 0.75rem;
          padding: 0.4rem 1rem;
          background: rgba(0, 242, 255, 0.1);
          border: 1px solid rgba(0, 242, 255, 0.3);
          border-radius: 99px;
          color: var(--electric-blue);
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }
        .countdown-circle {
          position: relative;
          width: 160px;
          height: 160px;
          margin: 0 auto 3rem;
        }
        .countdown-circle svg {
          transform: rotate(-90deg);
        }
        .circle-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.1);
          stroke-width: 8;
        }
        .circle-progress {
          fill: none;
          stroke: var(--alert-red);
          stroke-width: 8;
          stroke-linecap: round;
        }
        .countdown-number {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
          font-weight: 900;
          color: #fff;
        }
        
        .voice-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
            font-size: 0.85rem;
            font-weight: 700;
            color: var(--text-mid);
        }
        .voice-indicator.listening {
            color: var(--electric-blue);
        }
        .voice-indicator.error {
            color: var(--warning-amber, #f59e0b);
        }
        .mic-pulse {
            display: inline-block;
            animation: mic-bounce 0.8s ease-in-out infinite alternate;
        }
        @keyframes mic-bounce {
            from { transform: scale(1); opacity: 0.7; }
            to { transform: scale(1.3); opacity: 1; }
        }
        .speech-transcript {
            font-size: 0.9rem;
            font-style: italic;
            color: var(--text-high);
            background: rgba(255,255,255,0.05);
            padding: 0.5rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            min-height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .media-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.4rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--text-mid);
          margin: 0.5rem auto 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          width: fit-content;
        }
        .media-badge.recording {
          color: var(--alert-red);
          border-color: rgba(255, 59, 59, 0.3);
          background: rgba(255, 59, 59, 0.05);
        }
        .media-badge.ready {
          color: var(--electric-blue);
          border-color: rgba(0, 242, 255, 0.3);
        }
        .rec-dot {
          width: 8px;
          height: 8px;
          background: var(--alert-red);
          border-radius: 50%;
          animation: pulse-red 1s infinite alternate;
        }
        @keyframes pulse-red {
          from { opacity: 0.4; }
          to { opacity: 1; transform: scale(1.2); }
        }

        .alert-actions {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-top: 1.5rem;
        }
        .btn-safe {
          background: var(--bg-glass-heavy);
          border: 1px solid var(--border-glass);
          color: #fff;
          padding: 1.25rem;
          border-radius: var(--radius-lg);
          font-weight: 800;
          letter-spacing: 0.05em;
          cursor: pointer;
        }
        .btn-sos-trigger {
          background: var(--alert-red);
          color: #fff;
          padding: 1.25rem;
          border-radius: var(--radius-lg);
          font-weight: 900;
          letter-spacing: 0.05em;
          box-shadow: 0 10px 30px rgba(255, 59, 59, 0.4);
          cursor: pointer;
          border: none;
        }
        .success-icon {
          font-size: 5rem;
          margin-bottom: 1.5rem;
        }
        .success-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--electric-blue);
          margin-bottom: 0.5rem;
        }
        .success-msg {
          color: var(--text-low);
          margin-bottom: 2.5rem;
        }
        .btn-close-alert {
          background: var(--electric-blue);
          color: var(--bg-space);
          padding: 1rem 3rem;
          border-radius: var(--radius-pill);
          font-weight: 800;
          border: none;
        }
      `}</style>

      {/* Hidden processing elements */}
      <video ref={videoRef} autoPlay muted playsInline style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
