import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { sendChatMessage } from './eripApi';
import logo from '../../assets/crimecurb-logo.png';

// Guards get no operational data to ask Erip about beyond their own shift —
// keep this list in sync with the roles tools.py actually authorizes.
const ERIP_VISIBLE_ROLES = ['ADMIN', 'MANAGER', 'SUPERVISOR', 'GUARD'];

interface LocalMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  pending?: boolean;
}

// The Web Speech API (SpeechRecognition / webkitSpeechRecognition) isn't in
// TypeScript's default DOM lib, so it's typed loosely here rather than
// pulled in via a global .d.ts you may not have. Chrome/Edge only —
// Safari and Firefox don't reliably implement SpeechRecognition.
const SpeechRecognitionCtor: any =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

const speechSupported =
  !!SpeechRecognitionCtor && typeof window !== 'undefined' && 'speechSynthesis' in window;

type VoiceStatus = 'idle' | 'listening' | 'speaking';

export default function ErpChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  // Refs mirror the state above so imperative Web Speech callbacks (which
  // capture whatever was true when they were created) always see the
  // latest value instead of a stale one from an earlier render.
  const voiceModeRef = useRef(false);
  const statusRef = useRef<VoiceStatus>('idle');
  const conversationIdRef = useRef<string | null>(null);
  const sendingRef = useRef(false);
  conversationIdRef.current = conversationId;
  sendingRef.current = sending;

  const lastUserKeyRef = useRef<string | null>(null);

  useEffect(() => {
    // The widget lives at the App.tsx level and never unmounts on
    // login/logout if that transition doesn't hard-reload the page. Without
    // this, one account's chat history stays in memory and shows up under
    // the next account that logs in on the same tab. Reset on any change —
    // including logout (user becomes null) and switching accounts.
    const userKey = user ? String((user as any).id ?? user.email ?? user.role) : null;
    if (lastUserKeyRef.current !== null && lastUserKeyRef.current !== userKey) {
      setMessages([]);
      setConversationId(null);
      setInput('');
      setError(null);
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      voiceModeRef.current = false;
      setVoiceMode(false);
      setStatus('idle');
    }
    lastUserKeyRef.current = userKey;
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    // Stop everything if the widget unmounts mid-conversation.
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  function setStatus(s: VoiceStatus) {
    statusRef.current = s;
    setVoiceStatus(s);
  }

  const startListening = useCallback(() => {
    if (!speechSupported || recognitionRef.current) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.continuous = false; // stops itself once it detects a pause
    recognition.interimResults = false; // only fires onresult when speech is final

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      recognitionRef.current = null;
      // Mark idle *before* onend fires, so onend's restart-on-silence logic
      // doesn't also fire here — the restart after this happens once Erip's
      // spoken reply finishes, not immediately.
      setStatus('idle');
      sendVoiceMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      recognitionRef.current = null;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access was blocked. Enable it in your browser settings to use voice chat.');
        voiceModeRef.current = false;
        setVoiceMode(false);
        setStatus('idle');
      }
      // Other errors (e.g. "no-speech" after a long pause) fall through and
      // let onend's restart logic try again, since the mic just timed out.
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (voiceModeRef.current && statusRef.current === 'listening') {
        // Browser stopped listening on its own (silence/timeout) without a
        // result — restart. Small delay avoids a tight retry loop.
        setTimeout(() => {
          if (voiceModeRef.current) startListening();
        }, 300);
      }
    };

    recognitionRef.current = recognition;
    setStatus('listening');
    recognition.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopListening() {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setStatus('idle');
  }

  const speak = useCallback(
    (text: string) => {
      if (!speechSupported) return;
      window.speechSynthesis.cancel(); // don't let replies overlap
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setStatus('speaking');
      utterance.onend = () => {
        setStatus('idle');
        if (voiceModeRef.current) startListening();
      };
      utterance.onerror = () => {
        setStatus('idle');
        if (voiceModeRef.current) startListening();
      };
      window.speechSynthesis.speak(utterance);
    },
    [startListening]
  );

  // Shared send path for both typed and spoken input, so voice mode and the
  // text box behave identically against the backend.
  const deliverMessage = useCallback(
    async (text: string, isVoice: boolean) => {
      if (sendingRef.current) return;
      const userMsg: LocalMessage = { id: `local-${Date.now()}`, role: 'USER', content: text };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setSending(true);
      setError(null);

      try {
        const res = await sendChatMessage(text, conversationIdRef.current);
        setConversationId(res.conversation_id);
        setMessages((prev) => [
          ...prev,
          { id: `reply-${Date.now()}`, role: 'ASSISTANT', content: res.reply },
        ]);
        if (isVoice && voiceModeRef.current) {
          speak(res.reply);
        }
      } catch {
        setError("Erip couldn't respond just now. Try again in a moment.");
        if (isVoice && voiceModeRef.current) startListening();
      } finally {
        setSending(false);
      }
    },
    [speak, startListening]
  );

  const sendVoiceMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        if (voiceModeRef.current) startListening();
        return;
      }
      deliverMessage(trimmed, true);
    },
    [deliverMessage, startListening]
  );

  function toggleVoiceMode() {
    if (!speechSupported) return;
    if (voiceMode) {
      voiceModeRef.current = false;
      setVoiceMode(false);
      window.speechSynthesis.cancel();
      stopListening();
    } else {
      voiceModeRef.current = true;
      setVoiceMode(true);
      setOpen(true);
      startListening();
    }
  }

  function closePanel() {
    if (voiceMode) toggleVoiceMode();
    setOpen(false);
  }

  if (!user?.role || !ERIP_VISIBLE_ROLES.includes(user.role)) {
    return null;
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    await deliverMessage(text, false);
  }

  const statusLabel =
    voiceStatus === 'listening' ? 'Listening…' : voiceStatus === 'speaking' ? 'Erip is speaking…' : null;

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => (open ? closePanel() : setOpen(true))}
        aria-label={open ? 'Close Erip chat' : 'Open Erip chat'}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-crimecurb-navy text-white shadow-lg ring-1 ring-crimecurb-red/40 transition hover:ring-2 hover:ring-crimecurb-red focus:outline-none focus-visible:ring-2 focus-visible:ring-crimecurb-red focus-visible:ring-offset-2"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              d="M21 12c0 4.418-4.03 8-9 8-1.06 0-2.077-.163-3.02-.462L3 21l1.5-4.5C3.55 15.06 3 13.585 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Erip assistant"
          className="fixed bottom-24 right-6 z-40 flex h-[32rem] w-96 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-lg border-t-2 border-crimecurb-red bg-white shadow-xl"
        >
          <div className="flex items-center justify-between bg-crimecurb-navy px-4 py-3">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="" className="h-8 w-8 object-contain" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-crimecurb-red/90">
                  Crimecurb Security
                </p>
                <p className="font-display text-sm font-bold tracking-tight text-white">Erip</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusLabel && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-white/90">
                  <span
                    className={`h-1.5 w-1.5 rounded-full bg-crimecurb-red ${
                      voiceStatus === 'listening' ? 'animate-pulse' : 'animate-bounce'
                    }`}
                  />
                  {statusLabel}
                </span>
              )}
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {user.role}
              </span>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-sm text-slate-500">
                Ask what's happening right now — who's checked in, which sites are short-staffed,
                what incidents came in today. I'll flag attendance patterns worth a second look,
                but I only report — nothing gets assigned, sent, or changed without a person doing
                it.
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={m.role === 'USER' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    m.role === 'USER'
                      ? 'max-w-[85%] rounded-lg bg-crimecurb-navy px-3 py-2 text-sm text-white'
                      : 'max-w-[85%] rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800'
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-400">Thinking…</div>
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-slate-200 p-3">
            <button
              type="button"
              onClick={toggleVoiceMode}
              disabled={!speechSupported}
              aria-label={voiceMode ? 'Turn off voice chat' : 'Turn on voice chat'}
              title={
                speechSupported
                  ? voiceMode
                    ? 'Turn off voice chat'
                    : 'Turn on voice chat'
                  : 'Voice chat needs Chrome or Edge'
              }
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-40 ${
                voiceMode
                  ? 'border-crimecurb-red bg-crimecurb-red text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
                <path d="M19 11a7 7 0 0 1-14 0M12 18v3" strokeLinecap="round" />
              </svg>
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder={voiceMode ? 'Voice chat is on — just talk…' : 'Message Erip…'}
              disabled={voiceMode}
              className="flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-crimecurb-navy focus:outline-none focus:ring-1 focus:ring-crimecurb-navy disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button
              type="submit"
              disabled={sending || !input.trim() || voiceMode}
              className="rounded-md bg-crimecurb-navy px-3 py-2 text-sm font-medium text-white transition hover:bg-crimecurb-navy/90 disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}