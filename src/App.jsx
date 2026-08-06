import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Flame, Sparkles, Cake, Heart, Music, VolumeX,
  Sun, Moon, RotateCcw, Download,
} from "lucide-react";

/**
 * Birthday Wish — a small staged interaction:
 *   1. Light the candles
 *   2. Blow them out (one wish per candle)
 *   3. Cut the cake
 *   4. The letter — with replay and a downloadable keepsake
 *
 * Personalize below.
 */

const NAME = "Apple";
const CANDLE_COUNT = 5;
const SENDER_NAME = "Rude Guy"; // signs the closing line, e.g. "Alex", "Your favorite person"

const BONUS_LINES = [
  "P.S. — there's a real Kinder Joy and a stash of Schoko-Bons waiting for you too 🍫",
  "P.S. — consider this your official notice: Kinder Joy and Schoko-Bons, incoming 🍫",
];

const LETTER_LINES = [
  `Dear ${NAME},`,
  `You are one of the pookiest sweetheart I met in my life. It's been good spending time with you. There had been many up and downs in my life before we had met, honestly it was tough coming out from them and I'm glad that we met and you made me feel better. You're a great women and I'm lucky to have you in my life.`,
  `You were and is my emotional support, though I am very reserved and I don't show my emotions easily but you always knew how to reach me and make me smile and honestly you made this rude guy somewhat soft (can't disagree). From late night coding sessions in colab or eating together in BREAK or sitting at open theatre, all of these moments I cherish and remember. I know I haven't told you enough times but I want to say it again and again thank you for what all you have done and I'm so grateful to have you in my life.`,
  `I pray to LORD SHIVA🔱 you achieve every happiness in your life you wish for. I know you are stronger than all the hurdles life throw at you and would fight 'em to achieve whatever you want in your life. I already know you are a smartass and would chase every dream of yours.`,
  `Happy Birthday sweetheart. The world is lucky to have you in it and you are lucky to have me hihihi (POOKIE NI HAI MERI?).`,
  `more love and wishes from my side 💕`,
  `Can't end without a pickup line yk ;)`,
  `Nee malakal pole aanu... doore ninn kaanumbol thanne bhangi undayirunnu, pakse aduthekk vannappol ninnil ninn kann edukkaan pattathaayi.❤️`,
];

// Set to an ISO date string (e.g. "2026-08-15T00:00:00") to lock the app until then.
// Leave empty to skip the countdown gate entirely.
const TARGET_DATE = "";

// Optional: set her birth year to show "turning X" in the intro. Leave empty to skip.
const BIRTH_YEAR = "2003";

function vibrate(pattern) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (e) { /* unsupported */ }
  }
}

/* ---------- Audio engine (synthesized — no external files) ---------- */

function useAudioEngine() {
  const ctxRef = useRef(null);
  const musicNodesRef = useRef([]);
  const [musicOn, setMusicOn] = useState(false);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playTone = useCallback((freq, duration = 0.18, type = "sine", gainVal = 0.14) => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, [getCtx]);

  const playNoiseBurst = useCallback((duration = 0.35, filterFreq = 700, gainVal = 0.18) => {
    const ctx = getCtx();
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = gainVal;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }, [getCtx]);

  const playBlow = useCallback(() => playNoiseBurst(0.4, 500, 0.16), [playNoiseBurst]);
  const playCut = useCallback(() => playTone(180, 0.12, "square", 0.1), [playTone]);
  const playPop = useCallback(() => {
    playTone(880, 0.12, "sine", 0.12);
    setTimeout(() => playTone(1320, 0.15, "sine", 0.1), 90);
  }, [playTone]);
  const playChime = useCallback(() => {
    [523.25, 659.25, 783.99].forEach((f, i) =>
      setTimeout(() => playTone(f, 0.5, "sine", 0.1), i * 140)
    );
  }, [playTone]);
  const playKnock = useCallback(() => {
    playTone(340, 0.05, "square", 0.06);
  }, [playTone]);
  const playCrack = useCallback(() => {
    playNoiseBurst(0.18, 1800, 0.14);
    playTone(150, 0.16, "sine", 0.12);
  }, [playNoiseBurst, playTone]);

  const stopMusic = useCallback(() => {
    musicNodesRef.current.forEach(({ osc, lfo }) => {
      try { osc.stop(); lfo.stop(); } catch (e) { /* already stopped */ }
    });
    musicNodesRef.current = [];
    setMusicOn(false);
  }, []);

  const startMusic = useCallback(() => {
    const ctx = getCtx();
    const master = ctx.createGain();
    master.gain.value = 0.045;
    master.connect(ctx.destination);

    const freqs = [261.63, 329.63, 392.0, 523.25]; // warm C major pad
    const nodes = freqs.map((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.02;
      osc.connect(g);
      g.connect(master);

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.015;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.015;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);

      osc.start();
      lfo.start();
      return { osc, lfo, g };
    });
    musicNodesRef.current = nodes;
    setMusicOn(true);
  }, [getCtx]);

  const toggleMusic = useCallback(() => {
    if (musicOn) stopMusic(); else startMusic();
  }, [musicOn, startMusic, stopMusic]);

  useEffect(() => () => stopMusic(), [stopMusic]);

  return { musicOn, toggleMusic, playBlow, playCut, playPop, playChime, playKnock, playCrack };
}

/* ---------- Root ---------- */

export default function BirthdayApp() {
  const [theme, setTheme] = useState("dark"); // 'dark' | 'light'
  const [gate, setGate] = useState(() => (TARGET_DATE ? "locked" : "open"));
  const [step, setStep] = useState("intro");
  const [wishText, setWishText] = useState("");
  const [lit, setLit] = useState(Array(CANDLE_COUNT).fill(true));
  const [confetti, setConfetti] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [cutProgress, setCutProgress] = useState(0);
  const [revealedLines, setRevealedLines] = useState(0);
  const audio = useAudioEngine();
  const allBlown = lit.every((l) => !l);
  const T = theme === "dark" ? darkTokens : lightTokens;

  useEffect(() => {
    if (step === "candles" && allBlown) {
      const t = setTimeout(() => setStep("cake"), 900);
      return () => clearTimeout(t);
    }
  }, [lit, step, allBlown]);

  useEffect(() => {
    if (step === "letter") {
      setConfetti(true);
      audio.playChime();
      const timers = letterLines.map((_, i) =>
        setTimeout(() => setRevealedLines((n) => Math.max(n, i + 1)), 500 + i * 750)
      );
      return () => timers.forEach(clearTimeout);
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const blowCandle = (i) => {
    audio.playBlow();
    vibrate(12);
    setLit((prev) => prev.map((v, idx) => (idx === i ? false : v)));
  };

  const handleCut = () => {
    if (cutProgress >= 100) return;
    audio.playCut();
    vibrate(20);
    setCutProgress((p) => {
      const next = Math.min(100, p + 34);
      if (next >= 100) setTimeout(() => setStep("letter"), 700);
      return next;
    });
  };

  const handleReplay = () => {
    vibrate(10);
    setStep("intro");
    setWishText("");
    setLit(Array(CANDLE_COUNT).fill(true));
    setCutProgress(0);
    setRevealedLines(0);
    setConfetti(false);
  };

  const handleMoreConfetti = () => {
    vibrate([10, 40, 10]);
    audio.playPop();
    setConfetti(false);
    setConfettiKey((k) => k + 1);
    requestAnimationFrame(() => setConfetti(true));
  };

  const handleEggTap = () => {
    vibrate(8);
    audio.playKnock();
  };

  const handleEggCrack = () => {
    vibrate([10, 30, 15, 20]);
    audio.playCrack();
  };

  const letterLines = wishText.trim()
    ? [
        LETTER_LINES[0],
        `You wished for "${wishText.trim()}" — I hope it finds its way to you.`,
        ...LETTER_LINES.slice(1),
      ]
    : LETTER_LINES;

  const handleDownload = () => {
    const text = letterLines.join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${NAME.replace(/\s+/g, "-").toLowerCase()}-birthday-letter.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (gate === "locked") {
    return (
      <div style={pageStyle(T)}>
        <style>{globalCss}</style>
        <Countdown target={TARGET_DATE} theme={T} onUnlock={() => setGate("revealing")} />
      </div>
    );
  }

  if (gate === "revealing") {
    return (
      <div style={pageStyle(T)}>
        <style>{globalCss}</style>
        <KaniFlash onDone={() => setGate("open")} />
      </div>
    );
  }

  return (
    <div style={pageStyle(T)}>
      <style>{globalCss}</style>

      {confetti && <Confetti key={confettiKey} />}
      <Balloons />
      <PalmTrees />
      <ElephantWalk />

      <div style={topBar}>
        <button
          aria-label="Toggle music"
          onClick={audio.toggleMusic}
          style={iconBtn(T)}
          className="press"
          title={audio.musicOn ? "Turn music off" : "Turn music on"}
        >
          {audio.musicOn ? <Music size={16} /> : <VolumeX size={16} />}
        </button>
        <button
          aria-label="Toggle theme"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          style={iconBtn(T)}
          className="press"
          title="Toggle light / dark"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div style={cardStyle(T)} className="rise">
        <div key={step} className="step-enter">
          {step === "intro" && <Intro T={T} onNext={() => setStep("wish")} />}
          {step === "wish" && (
            <WishInput
              T={T}
              value={wishText}
              onChange={setWishText}
              onNext={() => setStep("candles")}
            />
          )}
          {step === "candles" && (
            <Candles T={T} lit={lit} onBlow={blowCandle} allBlown={allBlown} />
          )}
          {step === "cake" && <CakeCut T={T} progress={cutProgress} onCut={handleCut} />}
          {step === "letter" && (
            <Letter
              T={T}
              letterLines={letterLines}
              revealedLines={revealedLines}
              onReplay={handleReplay}
              onDownload={handleDownload}
              onMoreConfetti={handleMoreConfetti}
              onCrackEgg={handleEggCrack}
              onTapEgg={handleEggTap}
            />
          )}
        </div>
      </div>

      <p style={footerStyle}>crafted with a little too much care, for {NAME}</p>
    </div>
  );
}

/* ---------- Countdown gate ---------- */

function Countdown({ target, theme, onUnlock }) {
  const [remaining, setRemaining] = useState(new Date(target) - new Date());

  useEffect(() => {
    const id = setInterval(() => {
      const diff = new Date(target) - new Date();
      setRemaining(diff);
      if (diff <= 0) {
        clearInterval(id);
        onUnlock();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [target, onUnlock]);

  const d = Math.max(0, Math.floor(remaining / 86400000));
  const h = Math.max(0, Math.floor((remaining / 3600000) % 24));
  const m = Math.max(0, Math.floor((remaining / 60000) % 60));
  const s = Math.max(0, Math.floor((remaining / 1000) % 60));

  return (
    <div style={cardStyle(theme)}>
      <div style={{ textAlign: "center" }}>
        <Sparkles size={22} color={theme.accent} style={{ marginBottom: 8 }} />
        <div style={eyebrowStyle(theme)}>YOUR VISHUKKANI</div>
        <h2 style={h2Style(theme)}>The first thing you'll see</h2>
        <p style={subStyle(theme)}>
          In Kerala, what you see first is said to set the tone for what follows.
          So this one's timed — hold on a little longer.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, margin: "18px 0" }}>
          {[["days", d], ["hrs", h], ["min", m], ["sec", s]].map(([label, val]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontFamily: "'Cormorant Garamond', serif", color: theme.title }}>
                {String(val).padStart(2, "0")}
              </div>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", color: theme.subtext }}>{label}</div>
            </div>
          ))}
        </div>
        <button onClick={onUnlock} style={{ ...linkBtn, color: theme.subtext }}>
          Peek anyway →
        </button>
      </div>
    </div>
  );
}

function KaniFlash({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 950);
    return () => clearTimeout(t);
  }, [onDone]);

  return <div style={kaniFlashStyle} className="kani-flash" />;
}

/* ---------- Steps ---------- */

function Intro({ T, onNext }) {
  const turning = BIRTH_YEAR ? new Date().getFullYear() - Number(BIRTH_YEAR) : null;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ ...eyebrowStyle(T), ...staggerStyle(0) }} className="stagger-in">
        A SMALL OCCASION
      </div>
      <h1 style={{ ...titleStyle(T), ...staggerStyle(120) }} className="stagger-in">
        Happy Birthday, {NAME}
      </h1>
      <p
        style={{ ...staggerStyle(180), fontFamily: "'Noto Sans Malayalam', sans-serif", fontSize: 17, color: T.accent, fontWeight: 600, marginBottom: 16 }}
        className="stagger-in"
      >
        ജന്മദിനാശംസകൾ
      </p>
      <p style={{ ...subStyle(T), ...staggerStyle(240) }} className="stagger-in">
        {turning
          ? `Turning ${turning} today. Before the message, a little ceremony.`
          : "Before the message, a little ceremony."}{" "}
        Light the candles, make a wish, cut the cake — then read what's waiting for you.
      </p>
      <div style={staggerStyle(360)} className="stagger-in">
        <button style={primaryBtn(T)} className="pulseRing press" onClick={onNext}>
          <Flame size={18} style={{ marginRight: 8 }} />
          Light the candles
        </button>
      </div>
    </div>
  );
}

function WishInput({ T, value, onChange, onNext }) {
  return (
    <div style={{ textAlign: "center" }} className="rise">
      <div style={eyebrowStyle(T)}>BEFORE YOU BLOW THEM OUT</div>
      <h2 style={h2Style(T)}>What are you wishing for?</h2>
      <p style={subStyle(T)}>Totally optional — type it, or skip straight to the candles.</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="A quiet year, good coffee, one big adventure..."
        maxLength={120}
        rows={3}
        style={wishTextarea(T)}
      />
      <div>
        <button style={primaryBtn(T)} className="press" onClick={onNext}>
          {value.trim() ? "Lock in this wish" : "Skip to candles"}
        </button>
      </div>
    </div>
  );
}

function Candles({ T, lit, onBlow, allBlown }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={eyebrowStyle(T)}>STEP ONE</div>
      <h2 style={h2Style(T)}>Tap each flame to make a wish</h2>
      <p style={subStyle(T)}>
        {allBlown ? "All wishes made." : `${lit.filter(Boolean).length} left to blow out.`}
      </p>
      <p style={{ fontSize: 11, color: T.subtext, letterSpacing: "0.04em", marginTop: -18, marginBottom: 24 }}>
        a nilavilakku, lit one wish at a time
      </p>

      <div style={lampWrap}>
        <div style={lampFlameRow}>
          {lit.map((isLit, i) => (
            <button
              key={i}
              onClick={() => isLit && onBlow(i)}
              style={{ ...styles.candleBtn, cursor: isLit ? "pointer" : "default" }}
              className="press"
              aria-label={isLit ? "Blow out flame" : "Flame out"}
            >
              <div style={styles.candleWrap}>
                {isLit ? (
                  <div className="flame" style={styles.flame} />
                ) : (
                  <div className="smoke" style={styles.smoke} />
                )}
                <div style={wickNub} />
              </div>
            </button>
          ))}
        </div>
        <div style={lampRim} />
        <div style={lampNeck} />
        <div style={lampBase} />
      </div>    </div>
  );
}

function CakeCut({ T, progress, onCut }) {
  const done = progress >= 100;
  const [crumbling, setCrumbling] = useState(false);

  const shards = useRef(
    Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      tx: (Math.random() - 0.5) * 180,
      ty: (Math.random() - 0.5) * 140 - 30,
      rot: (Math.random() - 0.5) * 420,
      size: 6 + Math.random() * 9,
      round: Math.random() > 0.4,
      color: ["#E8B04B", "#E85D4E", "#FBF8F3", "#C9432E", "#7A3B4E"][i % 5],
    }))
  ).current;

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => setCrumbling(true), 60);
      return () => clearTimeout(t);
    }
  }, [done]);

  return (
    <div style={{ textAlign: "center" }}>
      <div style={eyebrowStyle(T)}>STEP TWO</div>
      <h2 style={h2Style(T)}>Cut the cake</h2>
      <p style={subStyle(T)}>{done ? "Perfectly sliced." : "Tap the cake a few times."}</p>

      <div style={{ position: "relative", display: "inline-block" }}>
        <button
          onClick={onCut}
          disabled={done}
          style={{
            ...styles.cakeBtn,
            cursor: done ? "default" : "pointer",
            opacity: crumbling ? 0 : 1,
            transform: crumbling ? "scale(0.85)" : "scale(1)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
          className="press"
          aria-label="Cut the cake"
        >
          <Cake size={72} strokeWidth={1.4} color="#7A3B4E" />
          <div
            style={{
              ...styles.knife,
              transform: `rotate(${-20 + progress * 0.9}deg) translateX(${progress * 0.4}px)`,
            }}
          >
            🔪
          </div>
        </button>

        {done && (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {shards.map((s) => (
              <div
                key={s.id}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: s.size,
                  height: s.size,
                  borderRadius: s.round ? "50%" : "2px",
                  background: s.color,
                  transform: crumbling
                    ? `translate(calc(-50% + ${s.tx}px), calc(-50% + ${s.ty}px)) rotate(${s.rot}deg) scale(0.3)`
                    : "translate(-50%, -50%) rotate(0deg) scale(1)",
                  opacity: crumbling ? 0 : 0.95,
                  transition: "transform 0.7s ease-out, opacity 0.7s ease-out",
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>
    </div>
  );
}

function Ornament({ T }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "18px 0" }}>
      <span style={{ width: 36, height: 1, background: T.divider }} />
      <Sparkles size={12} color={T.accent} />
      <span style={{ width: 36, height: 1, background: T.divider }} />
    </div>
  );
}

const REQUIRED_TAPS = 3;

function SurpriseEgg({ T, onCrack, onTap }) {
  const [taps, setTaps] = useState(0);
  const [cracked, setCracked] = useState(false);
  const [burst, setBurst] = useState(false);
  const [showCapsule, setShowCapsule] = useState(false);
  const [showText, setShowText] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [lineIndex] = useState(() => Math.floor(Math.random() * BONUS_LINES.length));

  const particles = useRef(
    Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      tx: (Math.random() - 0.5) * 130,
      ty: (Math.random() - 0.5) * 100 - 20,
      size: 4 + Math.random() * 6,
      color: ["#F5C518", "#E4292B", "#FBF8F3", "#7A3B4E"][i % 4],
      round: Math.random() > 0.4,
    }))
  ).current;

  const handleClick = () => {
    if (cracked) return;
    const nextTaps = taps + 1;
    if (nextTaps < REQUIRED_TAPS) {
      setTaps(nextTaps);
      setShakeKey((k) => k + 1);
      onTap();
      return;
    }
    setTaps(nextTaps);
    setCracked(true);
    setBurst(true);
    onCrack();
    setTimeout(() => setShowCapsule(true), 150);
    setTimeout(() => setShowText(true), 650);
  };

  const cracksLeft = REQUIRED_TAPS - taps;

  return (
    <div style={{ textAlign: "center", marginTop: 22 }}>
      {!cracked && (
        <p style={{ fontSize: 11, color: T.subtext, marginBottom: 10, letterSpacing: "0.06em" }}>
          {taps === 0 ? "ONE MORE SURPRISE — TAP TO CRACK" : `${cracksLeft} MORE TAP${cracksLeft > 1 ? "S" : ""}`}
        </p>
      )}
      <button
        key={shakeKey}
        onClick={handleClick}
        aria-label="Crack open the surprise egg"
        style={{ background: "none", border: "none", cursor: cracked ? "default" : "pointer", padding: 8, position: "relative" }}
        className={cracked ? "" : "press egg-shake"}
      >
        {burst && (
          <div style={eggGlow} />
        )}
        <div style={eggWrap} className={cracked ? "" : "egg-idle"}>
          <div
            style={{
              ...eggTopHalf(T),
              transform: cracked ? "translateY(-14px) rotate(-8deg)" : "translateY(0) rotate(0deg)",
            }}
          >
            <div style={eggShine} />
          </div>
          <div
            style={{
              ...eggBottomHalf(T),
              transform: cracked ? "translateY(14px) rotate(8deg)" : "translateY(0) rotate(0deg)",
            }}
          />
          {showCapsule && (
            <div style={capsuleWrap} className="capsule-pop">
              <div style={capsuleTop} />
              <div style={capsuleBottom} />
            </div>
          )}
        </div>
        {burst && (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {particles.map((p) => (
              <div
                key={p.id}
                className="egg-particle"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: p.size,
                  height: p.size,
                  borderRadius: p.round ? "50%" : "2px",
                  background: p.color,
                  "--tx": `${p.tx}px`,
                  "--ty": `${p.ty}px`,
                }}
              />
            ))}
          </div>
        )}
      </button>
      {showText && (
        <p className="rise" style={eggBonusText(T)}>
          {BONUS_LINES[lineIndex]}
        </p>
      )}
    </div>
  );
}

function Letter({ T, letterLines, revealedLines, onReplay, onDownload, onMoreConfetti, onCrackEgg, onTapEgg }) {
  const salutation = letterLines[0];
  const body = letterLines.slice(1);

  return (
    <div>
      <div style={sealWrap}>
        <div style={sealStyle(T)}>
          <Heart size={18} color="#FBF8F3" fill="#FBF8F3" />
        </div>
      </div>

      <div style={paperStyle(T)}>
        <p
          style={{
            ...letterLineStyle(T),
            fontStyle: "italic",
            fontWeight: 600,
            textAlign: "center",
            opacity: revealedLines > 0 ? 1 : 0,
            transform: revealedLines > 0 ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          {salutation}
        </p>

        <Ornament T={T} />

        {body.map((line, i) => {
          const visible = revealedLines > i + 1;
          const isFirst = i === 0;
          return (
            <p
              key={i}
              style={{
                ...letterLineStyle(T),
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(8px)",
                transition: "opacity 0.6s ease, transform 0.6s ease",
                textAlign: "left",
                overflow: isFirst ? "hidden" : "visible",
              }}
            >
              {isFirst ? (
                <>
                  <span style={dropCapStyle(T)}>{line.charAt(0)}</span>
                  {line.slice(1)}
                </>
              ) : (
                line
              )}
            </p>
          );
        })}

        {revealedLines >= letterLines.length && (
          <div className="rise" style={signatureBlock}>
            <div style={{ fontSize: 15, color: T.subtext, marginBottom: 4, fontFamily: "'Noto Sans Malayalam', sans-serif", fontWeight: 500 }}>
              സ്നേഹത്തോടെ,
            </div>
            <div style={signatureName(T)}>{SENDER_NAME}</div>
          </div>
        )}
      </div>

      {revealedLines >= letterLines.length && (
        <SurpriseEgg T={T} onCrack={onCrackEgg} onTap={onTapEgg} />
      )}

      <button
        onClick={onMoreConfetti}
        aria-label="More confetti"
        style={{ display: "flex", margin: "18px auto 0", background: "none", border: "none", cursor: "pointer" }}
        title="More confetti"
      >
        <Sparkles size={16} color={T.accent} />
      </button>

      {revealedLines >= letterLines.length && (
        <div className="rise" style={{ marginTop: 18, borderTop: `1px solid ${T.divider}`, paddingTop: 18 }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onReplay} style={secondaryBtn(T)} className="press">
              <RotateCcw size={14} style={{ marginRight: 6 }} /> Replay
            </button>
            <button onClick={onDownload} style={secondaryBtn(T)} className="press">
              <Download size={14} style={{ marginRight: 6 }} /> Save keepsake
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Ambient decoration ---------- */

function Balloons() {
  const balloons = useRef(
    Array.from({ length: 7 }).map((_, i) => ({
      id: i,
      left: 5 + i * 13 + Math.random() * 6,
      delay: Math.random() * 6,
      duration: 14 + Math.random() * 8,
      color: ["#E8B04B", "#C97B84", "#F4C9D6", "#7A3B4E"][i % 4],
      scale: 0.7 + Math.random() * 0.5,
    }))
  ).current;

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {balloons.map((b) => (
        <div
          key={b.id}
          className="balloon"
          style={{
            position: "absolute",
            left: `${b.left}vw`,
            bottom: -120,
            animation: `balloonRise ${b.duration}s linear ${b.delay}s infinite`,
            transform: `scale(${b.scale})`,
          }}
        >
          <div style={{ width: 34, height: 42, borderRadius: "50% 50% 50% 50% / 58% 58% 42% 42%", background: b.color, boxShadow: "inset -6px -6px 10px rgba(0,0,0,0.12)" }} />
          <div style={{ width: 1, height: 46, background: "rgba(255,255,255,0.35)", margin: "0 auto" }} />
        </div>
      ))}
    </div>
  );
}

function PalmTrees() {
  const trees = useRef([
    { left: -1, scale: 1, flip: false },
    { left: 12, scale: 0.7, flip: false },
    { left: 84, scale: 0.85, flip: true },
    { left: 95, scale: 1.1, flip: true },
  ]).current;

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0, opacity: 0.55 }}>
      {trees.map((t, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${t.left}vw`,
            bottom: -6,
            fontSize: 95 * t.scale,
            transform: t.flip ? "scaleX(-1)" : "none",
            filter: "grayscale(35%) brightness(0.8)",
          }}
        >
          🌴
        </div>
      ))}
    </div>
  );
}

function ElephantWalk() {
  return (
    <div style={{ position: "fixed", bottom: 6, left: 0, width: "100%", overflow: "hidden", pointerEvents: "none", zIndex: 0, opacity: 0.5, height: 70 }}>
      <div
        className="elephant-walk"
        style={{ position: "absolute", bottom: 0, fontSize: 54, filter: "grayscale(40%) brightness(0.85)" }}
      >
        🐘
      </div>
    </div>
  );
}
function Confetti() {
  const colors = ["#F5A623", "#FFFDF0", "#E63946", "#F7C548", "#4C7A3D"];
  const pieces = useRef(
    Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 2.6 + Math.random() * 2,
      size: 6 + Math.random() * 7,
      color: colors[i % colors.length],
      shape: Math.random() > 0.55 ? "petal" : "round",
    }))
  ).current;

  return (
    <>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            position: "fixed",
            top: 0,
            left: `${p.left}vw`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.shape === "petal" ? "50% 0% 50% 0%" : "50%",
            animation: `fall ${p.duration}s linear ${p.delay}s forwards`,
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
      ))}
    </>
  );
}

/* ---------- Theme tokens ---------- */

const darkTokens = {
  pageBg: "radial-gradient(circle at 50% 0%, #3A2440 0%, #241729 55%, #1B0F1F 100%)",
  card: "#FBF8F3",
  paper: "#F7EFE1",
  title: "#3A2440",
  subtext: "#6B5A6E",
  accent: "#E8B04B",
  divider: "rgba(122,59,78,0.18)",
  iconBtnBg: "rgba(251,248,243,0.1)",
  iconBtnColor: "#F4C9D6",
};

const lightTokens = {
  pageBg: "radial-gradient(circle at 50% 0%, #FDEFE4 0%, #FBE3DC 55%, #F7D6DE 100%)",
  card: "#FFFFFF",
  paper: "#FBF6EF",
  title: "#3A2440",
  subtext: "#7A6B7D",
  accent: "#D9954A",
  divider: "rgba(122,59,78,0.12)",
  iconBtnBg: "rgba(58,36,64,0.06)",
  iconBtnColor: "#3A2440",
};

/* ---------- Style helpers ---------- */

const pageStyle = (T) => ({
  minHeight: "100vh",
  background: T.pageBg,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px 16px",
  fontFamily: "'Manrope', sans-serif",
  position: "relative",
});

const cardStyle = (T) => ({
  background: T.card,
  borderRadius: 20,
  padding: "44px 36px",
  width: "100%",
  maxWidth: 440,
  boxShadow:
    "0 30px 60px -20px rgba(0,0,0,0.45), inset 0 0 0 3px #D4A017, inset 0 0 0 6px " + T.card + ", inset 0 0 0 8px rgba(212,160,23,0.55)",
  border: "1px solid rgba(232,176,74,0.25)",
  position: "relative",
  zIndex: 1,
});

const eyebrowStyle = (T) => ({
  fontSize: 11,
  letterSpacing: "0.18em",
  color: "#B08A3E",
  fontWeight: 700,
  marginBottom: 10,
});

const titleStyle = (T) => ({
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 40,
  color: T.title,
  margin: "0 0 14px",
  lineHeight: 1.1,
});

const h2Style = (T) => ({
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 28,
  color: T.title,
  margin: "0 0 8px",
});

const subStyle = (T) => ({
  color: T.subtext,
  fontSize: 15,
  lineHeight: 1.6,
  marginBottom: 28,
});

const letterLineStyle = (T) => ({
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 19,
  color: T.title,
  lineHeight: 1.7,
  marginBottom: 14,
});

const sealWrap = {
  display: "flex",
  justifyContent: "center",
  marginBottom: 14,
};

const sealStyle = (T) => ({
  width: 44,
  height: 44,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: `radial-gradient(circle at 35% 30%, ${T.accent}, #C9432E 75%)`,
  boxShadow: "0 6px 16px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.35)",
  border: "2px solid rgba(251,248,243,0.6)",
});

const paperStyle = (T) => ({
  background: T.paper,
  border: `1px solid ${T.divider}`,
  borderRadius: 14,
  padding: "30px 26px 22px",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
});

const dropCapStyle = (T) => ({
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 44,
  fontWeight: 600,
  color: T.accent,
  float: "left",
  lineHeight: 0.8,
  marginRight: 8,
  marginTop: 4,
});

const signatureBlock = {
  marginTop: 20,
  paddingTop: 16,
  borderTop: "1px dashed rgba(122,59,78,0.25)",
  textAlign: "right",
};

const signatureName = (T) => ({
  fontFamily: "'Dancing Script', cursive",
  fontSize: 30,
  color: T.title,
});

const eggWrap = {
  width: 56,
  height: 74,
  margin: "0 auto",
  position: "relative",
};

const eggTopHalf = (T) => ({
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "52%",
  background: "#FBF8F3",
  borderRadius: "50% 50% 4px 4px / 100% 100% 4px 4px",
  border: `2px solid ${T.divider}`,
  borderBottom: "none",
  boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.05)",
  transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
  overflow: "hidden",
});

const eggBottomHalf = (T) => ({
  position: "absolute",
  bottom: 0,
  left: 0,
  width: "100%",
  height: "52%",
  background: "linear-gradient(180deg, #E85D4E 0%, #C9432E 100%)",
  borderRadius: "4px 4px 50% 50% / 4px 4px 100% 100%",
  border: `2px solid ${T.divider}`,
  borderTop: "none",
  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)",
  transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
});

const eggShine = {
  position: "absolute",
  top: "-10%",
  left: "10%",
  width: "35%",
  height: "140%",
  background: "linear-gradient(120deg, rgba(255,255,255,0.85), rgba(255,255,255,0))",
  transform: "rotate(20deg)",
};

const eggGlow = {
  position: "absolute",
  top: "50%",
  left: "50%",
  width: 100,
  height: 100,
  marginTop: -50,
  marginLeft: -50,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(245,197,24,0.55) 0%, rgba(245,197,24,0) 70%)",
  animation: "eggGlowPulse 0.7s ease-out forwards",
  pointerEvents: "none",
};

const capsuleWrap = {
  position: "absolute",
  top: "8%",
  left: "50%",
  width: 26,
  height: 20,
  marginLeft: -13,
  zIndex: 2,
};

const capsuleTop = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "55%",
  background: "#F5C518",
  borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
  border: "1.5px solid rgba(90,56,37,0.3)",
  borderBottom: "none",
};

const capsuleBottom = {
  position: "absolute",
  bottom: 0,
  left: 0,
  width: "100%",
  height: "55%",
  background: "#FFFDF8",
  borderRadius: "0 0 50% 50% / 0 0 100% 100%",
  border: "1.5px solid rgba(90,56,37,0.3)",
  borderTop: "none",
};

const eggBonusText = (T) => ({
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 17,
  fontStyle: "italic",
  color: T.title,
  marginTop: 14,
  maxWidth: 300,
  marginLeft: "auto",
  marginRight: "auto",
  lineHeight: 1.6,
});

const primaryBtn = (T) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#3A2440",
  color: "#F4C9D6",
  border: "none",
  borderRadius: 999,
  padding: "13px 26px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'Manrope', sans-serif",
});

const secondaryBtn = (T) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  color: T.title,
  border: `1px solid ${T.divider}`,
  borderRadius: 999,
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'Manrope', sans-serif",
});

const iconBtn = (T) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: "50%",
  border: "none",
  background: T.iconBtnBg,
  color: T.iconBtnColor,
  cursor: "pointer",
});

const staggerStyle = (delayMs) => ({
  opacity: 0,
  animationDelay: `${delayMs}ms`,
});

const wishTextarea = (T) => ({
  display: "block",
  width: "100%",
  maxWidth: 320,
  border: `1px solid ${T.divider}`,
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 14,
  fontFamily: "'Manrope', sans-serif",
  color: T.title,
  resize: "none",
  margin: "0 auto 20px",
  background: "transparent",
});

const linkBtn = {
  background: "none",
  border: "none",
  fontSize: 13,
  cursor: "pointer",
  textDecoration: "underline",
  fontFamily: "'Manrope', sans-serif",
};

const topBar = {
  position: "fixed",
  top: 16,
  right: 16,
  display: "flex",
  gap: 8,
  zIndex: 3,
};

const kaniFlashStyle = {
  position: "fixed",
  inset: 0,
  background: "radial-gradient(circle at 50% 50%, #FFF6D8 0%, #F5C518 45%, #8F1414 100%)",
  animation: "kaniFlash 0.95s ease-out forwards",
  zIndex: 50,
};

const footerStyle = {
  marginTop: 22,
  color: "rgba(244,201,214,0.55)",
  fontSize: 12,
  letterSpacing: "0.04em",
  position: "relative",
  zIndex: 1,
};

const styles = {
  candleBtn: { background: "none", border: "none", padding: 4 },
  candleWrap: { display: "flex", flexDirection: "column", alignItems: "center", height: 44, justifyContent: "flex-end", position: "relative" },
  flame: {
    width: 10, height: 18, borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
    background: "linear-gradient(180deg, #FFE9A8 0%, #E8B04B 45%, #C9622E 100%)",
    marginBottom: -2, boxShadow: "0 0 12px rgba(232,176,74,0.8)",
  },
  smoke: { width: 4, height: 14, borderRadius: 4, background: "#B7ADB9", marginBottom: 0 },
  cakeBtn: { background: "none", border: "none", position: "relative", padding: 10 },
  knife: { position: "absolute", top: 14, right: 22, fontSize: 22, transformOrigin: "bottom right", transition: "transform 0.25s ease" },
  progressTrack: { height: 6, background: "#EEE3DE", borderRadius: 999, overflow: "hidden", marginTop: 22 },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #E8B04B, #C97B84)", transition: "width 0.4s ease" },
};

const lampWrap = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const lampFlameRow = {
  display: "flex",
  justifyContent: "center",
  gap: 10,
  flexWrap: "wrap",
  zIndex: 1,
  position: "relative",
};

const wickNub = {
  width: 5,
  height: 9,
  borderRadius: "2px 2px 1px 1px",
  background: "#4A3222",
};

const brassGradient = "linear-gradient(180deg, #F5D77A 0%, #D4A017 50%, #8B6914 100%)";

const lampRim = {
  width: 168,
  height: 13,
  borderRadius: "50%",
  background: brassGradient,
  boxShadow: "inset 0 -2px 3px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.4)",
  marginTop: -2,
};

const lampNeck = {
  width: 22,
  height: 42,
  margin: "0 auto",
  background: brassGradient,
  clipPath: "polygon(30% 0%, 70% 0%, 88% 100%, 12% 100%)",
  boxShadow: "inset -3px 0 4px rgba(0,0,0,0.2)",
};

const lampBase = {
  width: 74,
  height: 16,
  margin: "0 auto",
  borderRadius: "50%",
  background: brassGradient,
  boxShadow: "inset 0 -2px 3px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.4), 0 4px 8px rgba(0,0,0,0.15)",
};

const globalCss = `
  * { box-sizing: border-box; }
  html, body { overflow-x: hidden; }

  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;500;600&family=Dancing+Script:wght@700&family=Noto+Sans+Malayalam:wght@500;600&display=swap');

  @keyframes flicker {
    0%, 100% { transform: scaleY(1) translateX(0); opacity: 1; }
    25% { transform: scaleY(1.08) translateX(-1px); opacity: 0.92; }
    50% { transform: scaleY(0.96) translateX(1px); opacity: 1; }
    75% { transform: scaleY(1.05) translateX(-0.5px); opacity: 0.95; }
  }
  @keyframes riseFade {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes softPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(232,176,74,0.35); }
    50% { box-shadow: 0 0 0 10px rgba(232,176,74,0); }
  }
  @keyframes fall {
    0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
    100% { transform: translateY(110vh) rotate(360deg); opacity: 0.9; }
  }
  @keyframes smokeUp {
    0% { opacity: 0.5; transform: translateY(0) scaleX(1); }
    100% { opacity: 0; transform: translateY(-26px) scaleX(1.6); }
  }
  @keyframes balloonRise {
    0% { transform: translateY(0) translateX(0); }
    50% { transform: translateY(-60vh) translateX(20px); }
    100% { transform: translateY(-125vh) translateX(-10px); }
  }
  @keyframes elephantWalk {
    0% { transform: translateX(-10vw); }
    100% { transform: translateX(110vw); }
  }
  .elephant-walk { animation: elephantWalk 55s linear infinite; }
  @keyframes kaniFlash {
    0% { opacity: 0; }
    22% { opacity: 1; }
    100% { opacity: 0; }
  }
  @keyframes stepIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes eggWobble {
    0%, 100% { transform: rotate(-3deg); }
    50% { transform: rotate(3deg); }
  }
  @keyframes eggShake {
    0%, 100% { transform: translateX(0) rotate(0deg); }
    20% { transform: translateX(-4px) rotate(-4deg); }
    40% { transform: translateX(4px) rotate(4deg); }
    60% { transform: translateX(-3px) rotate(-3deg); }
    80% { transform: translateX(3px) rotate(3deg); }
  }
  @keyframes eggGlowPulse {
    0% { opacity: 0; transform: scale(0.4); }
    40% { opacity: 1; }
    100% { opacity: 0; transform: scale(1.6); }
  }
  @keyframes eggParticleFling {
    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.3); opacity: 0; }
  }
  @keyframes capsuleBounce {
    0% { transform: translateY(0) scale(0.5); opacity: 0; }
    50% { transform: translateY(-34px) scale(1.05); opacity: 1; }
    70% { transform: translateY(-22px) scale(1); }
    100% { transform: translateY(-28px) scale(1); opacity: 1; }
  }
  .flame { animation: flicker 1.6s ease-in-out infinite; transform-origin: bottom center; }
  .rise { animation: riseFade 0.7s ease both; }
  .stagger-in { animation: riseFade 0.6s ease both; }
  .step-enter { animation: stepIn 0.45s ease both; }
  .pulseRing { animation: softPulse 2.2s ease-out infinite; }
  .smoke { animation: smokeUp 1.1s ease-out forwards; }
  .press { transition: transform 0.15s ease; }
  .press:active { transform: scale(0.94); }
  .egg-idle { animation: eggWobble 2.6s ease-in-out infinite; transform-origin: bottom center; }
  .egg-shake { animation: eggShake 0.4s ease; }
  .egg-particle { animation: eggParticleFling 0.6s ease-out forwards; }
  .capsule-pop { animation: capsuleBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

  @media (prefers-reduced-motion: reduce) {
    .flame, .rise, .stagger-in, .step-enter, .pulseRing, .balloon, .confetti-piece,
    .egg-idle, .egg-shake, .egg-particle, .capsule-pop, .kani-flash, .elephant-walk { animation: none !important; opacity: 1 !important; }
  }

  @media print {
    button, .icon-row { display: none !important; }
  }
`;
