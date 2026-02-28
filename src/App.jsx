import { useState, useRef, useEffect, useCallback } from "react";

// ============================================================
// STRIPE CONFIGURATION - UPDATE THESE VALUES
// ============================================================
// 1. Create products in Stripe Dashboard (https://dashboard.stripe.com/products)
// 2. Create prices for each product:
//    - Single Unlock: £0.99 one-time
//    - Lifetime Access: £9.99 one-time  
//    - Monthly Subscription: £2.99 recurring/month
// 3. Copy the Price IDs below
// ============================================================
// ============================================================
// STRIPE PAYMENT LINKS
// ============================================================
const PAYMENT_LINKS = {
  single: "https://buy.stripe.com/14A00laibbqJ6Dg0hP7g400",
  lifetime: "https://buy.stripe.com/cNi8wR61VdyR0eS1lT7g402",
  monthly: "https://buy.stripe.com/bJe3cxeyr7at3r41lT7g401",
};

// Sigil generation
function hashCode(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function drawSigil(canvas, letters, desire, showWatermark = true) {
  if (!canvas || letters.length === 0) return;

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(W, H) * 0.32;

  ctx.fillStyle = "#0a0a08";
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.8);
  glow.addColorStop(0, "rgba(140, 100, 40, 0.06)");
  glow.addColorStop(0.5, "rgba(100, 60, 20, 0.03)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const seed = hashCode(desire);
  const rng = seededRandom(seed);
  ctx.save();
  ctx.globalAlpha = 0.025;
  for (let i = 0; i < 3000; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const v = Math.floor(rng() * 60 + 180);
    ctx.fillStyle = `rgb(${v},${v - 20},${v - 40})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(180, 150, 80, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(180, 150, 80, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.42, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(201, 168, 76, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const numDots = letters.length + 4;
  for (let i = 0; i < numDots; i++) {
    const angle = (i / numDots) * Math.PI * 2 - Math.PI / 2;
    const dx = cx + Math.cos(angle) * radius * 1.35;
    const dy = cy + Math.sin(angle) * radius * 1.35;
    ctx.fillStyle = "rgba(201, 168, 76, 0.5)";
    ctx.beginPath();
    ctx.arc(dx, dy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const rng2 = seededRandom(seed + 7);
  const n = letters.length;
  const baseAngleStep = (Math.PI * 2) / Math.max(n, 1);

  ctx.strokeStyle = "rgba(201, 168, 76, 0.85)";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const points = [];

  letters.forEach((letter, i) => {
    const code = letter.charCodeAt(0) - 65;
    const baseAngle = baseAngleStep * i - Math.PI / 2;
    const angleJitter = (rng2() - 0.5) * 0.3;
    const angle = baseAngle + angleJitter;
    const lenFactor = 0.4 + (code / 26) * 0.5 + rng2() * 0.15;
    const len = radius * lenFactor;
    const px = cx + Math.cos(angle) * len;
    const py = cy + Math.sin(angle) * len;
    points.push({ x: px, y: py, code, angle, len });
  });

  if (points.length > 1) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const curveType = (prev.code + curr.code) % 3;

      if (curveType === 0) {
        ctx.lineTo(curr.x, curr.y);
      } else if (curveType === 1) {
        const cpx = (prev.x + curr.x) / 2 + (rng2() - 0.5) * radius * 0.5;
        const cpy = (prev.y + curr.y) / 2 + (rng2() - 0.5) * radius * 0.5;
        ctx.quadraticCurveTo(cpx, cpy, curr.x, curr.y);
      } else {
        const cp1x = prev.x + (rng2() - 0.5) * radius * 0.6;
        const cp1y = prev.y + (rng2() - 0.5) * radius * 0.6;
        const cp2x = curr.x + (rng2() - 0.5) * radius * 0.6;
        const cp2y = curr.y + (rng2() - 0.5) * radius * 0.6;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
      }
    }

    if (points.length > 2) {
      const last = points[points.length - 1];
      const first = points[0];
      const cpx = (last.x + first.x) / 2 + (rng2() - 0.5) * radius * 0.3;
      const cpy = (last.y + first.y) / 2 + (rng2() - 0.5) * radius * 0.3;
      ctx.quadraticCurveTo(cpx, cpy, first.x, first.y);
    }

    ctx.stroke();

    const crossCount = Math.min(Math.floor(n / 2), 4);
    ctx.strokeStyle = "rgba(201, 168, 76, 0.45)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < crossCount; i++) {
      const idx1 = Math.floor(rng2() * points.length);
      const idx2 = (idx1 + Math.floor(points.length / 2) + Math.floor(rng2() * 2)) % points.length;
      if (idx1 !== idx2) {
        const p1 = points[idx1];
        const p2 = points[idx2];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        const midx = (p1.x + p2.x) / 2 + (rng2() - 0.5) * radius * 0.4;
        const midy = (p1.y + p2.y) / 2 + (rng2() - 0.5) * radius * 0.4;
        ctx.quadraticCurveTo(midx, midy, p2.x, p2.y);
        ctx.stroke();
      }
    }
  }

  ctx.strokeStyle = "rgba(201, 168, 76, 0.3)";
  ctx.lineWidth = 1;
  points.forEach((p) => {
    const innerR = radius * 0.08;
    const sx = cx + Math.cos(p.angle) * innerR;
    const sy = cy + Math.sin(p.angle) * innerR;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });

  points.forEach((p) => {
    ctx.strokeStyle = "rgba(201, 168, 76, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(201, 168, 76, 0.9)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = "rgba(201, 168, 76, 0.2)";
  ctx.lineWidth = 1;
  letters.forEach((letter, i) => {
    const code = letter.charCodeAt(0) - 65;
    if (code % 3 === 0) {
      const arcRadius = radius * (0.15 + (code / 26) * 0.25);
      const startAngle = (i / n) * Math.PI * 2;
      const endAngle = startAngle + Math.PI * (0.3 + rng2() * 0.5);
      ctx.beginPath();
      ctx.arc(cx, cy, arcRadius, startAngle, endAngle);
      ctx.stroke();
    }
  });

  ctx.fillStyle = "rgba(201, 168, 76, 0.7)";
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(201, 168, 76, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.1, 0, Math.PI * 2);
  ctx.stroke();

  const triSize = 6;
  ctx.fillStyle = "rgba(201, 168, 76, 0.5)";
  ctx.beginPath();
  ctx.moveTo(cx, cy - triSize);
  ctx.lineTo(cx - triSize * 0.866, cy + triSize * 0.5);
  ctx.lineTo(cx + triSize * 0.866, cy + triSize * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const sigilGlow = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 0.9);
  sigilGlow.addColorStop(0, "rgba(201, 168, 76, 0.04)");
  sigilGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = sigilGlow;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  if (showWatermark) {
    ctx.fillStyle = "rgba(10, 10, 8, 0.35)";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 4);

    const fontSize = Math.round(W * 0.09);
    ctx.font = `700 ${fontSize}px Cinzel, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const spacing = fontSize * 2.2;
    for (let row = -7; row <= 7; row++) {
      for (let col = -5; col <= 5; col++) {
        const x = col * spacing * 1.8;
        const y = row * spacing;
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillText("PREVIEW", x + 2, y + 2);
        ctx.fillStyle = "rgba(201, 168, 76, 0.18)";
        ctx.fillText("PREVIEW", x, y);
      }
    }

    ctx.rotate(Math.PI / 4);
    const bigSize = Math.round(W * 0.18);
    ctx.font = `700 ${bigSize}px Cinzel, serif`;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.lineWidth = Math.round(W * 0.006);
    ctx.strokeText("PREVIEW", 0, 0);
    ctx.fillStyle = "rgba(201, 168, 76, 0.3)";
    ctx.fillText("PREVIEW", 0, 0);

    ctx.rotate(-Math.PI / 4);
    ctx.strokeStyle = "rgba(201, 168, 76, 0.07)";
    ctx.lineWidth = 1;
    for (let i = -20; i <= 20; i++) {
      const y = i * (fontSize * 1.1);
      ctx.beginPath();
      ctx.moveTo(-W, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.restore();
  }
}

const STEPS = [
  { label: "I. Declare Intent", desc: "Write your desire as a clear statement" },
  { label: "II. Purify", desc: "Vowels and repeating letters are stripped away" },
  { label: "III. Distill", desc: "Only unique consonants remain — the essence" },
  { label: "IV. Transmute", desc: "Letters become geometry, geometry becomes symbol" },
];

const TIERS = [
  { 
    id: "single", 
    name: "Single Sigil", 
    desc: "Unlock this sigil",
    price: "£0.99",
    link: PAYMENT_LINKS.single,
    icon: "⬡",
    features: ["High-resolution 2000×2000 JPG", "No watermark", "Instant download"],
  },
  { 
    id: "monthly", 
    name: "Monthly", 
    desc: "Unlimited sigils",
    price: "£2.99",
    sub: "/month",
    link: PAYMENT_LINKS.monthly,
    icon: "↻",
    badge: "POPULAR",
    features: ["Unlimited sigil downloads", "High-resolution exports", "No watermarks", "Cancel anytime"],
  },
  { 
    id: "lifetime", 
    name: "Lifetime Access", 
    desc: "Unlimited sigils forever",
    price: "£9.99",
    link: PAYMENT_LINKS.lifetime,
    icon: "∞",
    badge: "BEST VALUE",
    features: ["Unlimited sigil downloads", "High-resolution exports", "No watermarks ever", "One-time payment", "Future features included"],
  },
];

export default function SigilForge() {
  const [desire, setDesire] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [uniqueLetters, setUniqueLetters] = useState([]);
  const [animStep, setAnimStep] = useState(-1);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState("single");
  const [isPurchased, setIsPurchased] = useState(false);
  const [hasUnlimitedAccess, setHasUnlimitedAccess] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const canvasRef = useRef(null);

  // Check for returning from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const tier = params.get("tier");
    
    if (status === "success") {
      const savedData = sessionStorage.getItem("sigil_pending");
      if (savedData) {
        try {
          const { desire: savedDesire, letters: savedLetters } = JSON.parse(savedData);
          setDesire(savedDesire);
          setUniqueLetters(savedLetters);
          setShowResult(true);
          setAnimStep(3);
          setIsPurchased(true);
          if (tier === "lifetime" || tier === "monthly") {
            setHasUnlimitedAccess(true);
            localStorage.setItem("sigil_access", tier);
          }
          setShowSuccess(true);
          sessionStorage.removeItem("sigil_pending");
          setTimeout(() => setShowSuccess(false), 5000);
        } catch (e) {
          console.error("Failed to restore:", e);
        }
      }
      window.history.replaceState({}, "", window.location.pathname);
    } else if (status === "cancelled") {
      const savedData = sessionStorage.getItem("sigil_pending");
      if (savedData) {
        try {
          const { desire: savedDesire, letters: savedLetters } = JSON.parse(savedData);
          setDesire(savedDesire);
          setUniqueLetters(savedLetters);
          setShowResult(true);
          setAnimStep(3);
          sessionStorage.removeItem("sigil_pending");
        } catch (e) {
          console.error("Failed to restore:", e);
        }
      }
      window.history.replaceState({}, "", window.location.pathname);
    }

    // Check for existing access
    const access = localStorage.getItem("sigil_access");
    if (access === "lifetime" || access === "monthly") {
      setHasUnlimitedAccess(true);
    }
  }, []);

  useEffect(() => {
    if (showResult && canvasRef.current && uniqueLetters.length > 0) {
      drawSigil(canvasRef.current, uniqueLetters, desire, !isPurchased && !hasUnlimitedAccess);
    }
  }, [showResult, uniqueLetters, desire, isPurchased, hasUnlimitedAccess]);

  const processDesire = useCallback(() => {
    if (!desire.trim()) return;
    setProcessing(true);
    setShowResult(false);
    setAnimStep(0);
    if (hasUnlimitedAccess) setIsPurchased(true);

    setTimeout(() => {
      setAnimStep(1);
      const stripped = desire.toUpperCase().replace(/[AEIOU\s]/g, "");

      setTimeout(() => {
        setAnimStep(2);
        const unique = [...new Set(stripped.split(""))].filter((c) => /[A-Z]/.test(c));
        setUniqueLetters(unique);

        setTimeout(() => {
          setAnimStep(3);
          setTimeout(() => {
            setShowResult(true);
            setProcessing(false);
          }, 800);
        }, 1200);
      }, 1200);
    }, 1000);
  }, [desire, hasUnlimitedAccess]);

  const handlePurchase = () => {
    const tier = TIERS.find(t => t.id === selectedTier);
    if (!tier) return;

    // Save sigil data to restore after payment
    sessionStorage.setItem("sigil_pending", JSON.stringify({ 
      desire, 
      letters: uniqueLetters 
    }));

    // Redirect to Stripe Payment Link
    window.location.href = tier.link;
  };

  const downloadSigil = () => {
    const hiRes = document.createElement("canvas");
    hiRes.width = 2000;
    hiRes.height = 2000;
    drawSigil(hiRes, uniqueLetters, desire, false);

    const link = document.createElement("a");
    link.download = "sigil.jpg";
    link.href = hiRes.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  const reset = () => {
    setDesire("");
    setCurrentStep(0);
    setProcessing(false);
    setShowResult(false);
    setUniqueLetters([]);
    setAnimStep(-1);
    if (!hasUnlimitedAccess) {
      setIsPurchased(false);
    }
  };

  const selectedTierData = TIERS.find(t => t.id === selectedTier);

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 30px rgba(201,168,76,0.1); }
          50% { box-shadow: 0 0 60px rgba(201,168,76,0.25); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes gentlePulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes successSlide {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .letter-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          margin: 4px;
          border: 1px solid rgba(201,168,76,0.4);
          color: #c9a84c;
          font-family: 'Cinzel', serif;
          font-size: 14px;
          font-weight: 500;
          animation: fadeInUp 0.4s ease forwards;
          background: rgba(201,168,76,0.06);
        }
        .struck {
          text-decoration: line-through;
          color: rgba(201,168,76,0.2) !important;
          border-color: rgba(201,168,76,0.1) !important;
          background: transparent !important;
        }
        
        textarea:focus { outline: none; border-color: rgba(201,168,76,0.5); box-shadow: 0 0 30px rgba(201,168,76,0.08); }
        
        .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(201,168,76,0.2); }
        .btn-secondary:hover { background: rgba(201,168,76,0.15) !important; }
        .link:hover { color: #c9a84c !important; }
        
        .tier-option { cursor: pointer; transition: all 0.3s ease; }
        .tier-option:hover { background: rgba(201,168,76,0.08) !important; }
        .tier-selected { background: rgba(201,168,76,0.12) !important; border-color: rgba(201,168,76,0.6) !important; }
        
        @media (max-width: 768px) {
          .hero-title { font-size: 32px !important; letter-spacing: 6px !important; }
          .hero-subtitle { font-size: 14px !important; }
          .canvas-display { width: 300px !important; height: 300px !important; }
          .tier-grid { flex-direction: column !important; }
        }
      `}</style>

      {/* Success Banner */}
      {showSuccess && (
        <div style={styles.successBanner}>
          <span>✦</span>
          <span>Payment successful — your sigil is ready to download</span>
        </div>
      )}

      {/* Hero Section */}
      <header style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.headerLine} />
          <h1 className="hero-title" style={styles.heroTitle}>SIGIL FORGE</h1>
          <p className="hero-subtitle" style={styles.heroSubtitle}>Transform desire into symbol</p>
          <div style={styles.headerLine} />
          
          {hasUnlimitedAccess && (
            <div style={styles.accessBadge}>
              <span>∞</span>
              <span>UNLIMITED ACCESS</span>
            </div>
          )}
        </div>
      </header>

      {/* Main App Section */}
      <main style={styles.main}>
        <div style={styles.container}>
          
          {/* Step Indicators */}
          <div style={styles.stepsRow}>
            {STEPS.map((step, i) => (
              <div
                key={i}
                style={{
                  ...styles.stepItem,
                  opacity: animStep >= i ? 1 : 0.3,
                }}
              >
                <div
                  style={{
                    ...styles.stepDot,
                    background: animStep >= i ? "#c9a84c" : "transparent",
                    borderColor: animStep >= i ? "#c9a84c" : "rgba(201,168,76,0.3)",
                  }}
                />
                <span style={{
                  ...styles.stepLabel,
                  color: animStep >= i ? "#c9a84c" : "rgba(201,168,76,0.5)",
                }}>
                  {step.label}
                </span>
                <span style={styles.stepDesc}>{step.desc}</span>
              </div>
            ))}
          </div>

          {/* Input / Result Area */}
          {!showResult ? (
            <div style={styles.inputSection}>
              <label style={styles.inputLabel}>
                State your desire with clarity and conviction
              </label>
              <textarea
                style={styles.textarea}
                value={desire}
                onChange={(e) => setDesire(e.target.value)}
                placeholder="I WISH TO..."
                maxLength={200}
                disabled={processing}
              />
              <div style={styles.charCount}>{desire.length}/200</div>

              {processing && animStep >= 1 && (
                <div style={{ ...styles.processBox, animation: "fadeInUp 0.5s ease forwards" }}>
                  {animStep >= 1 && (
                    <div style={styles.processStep}>
                      <span style={styles.processTitle}>Vowels removed:</span>
                      <div style={styles.letterRow}>
                        {desire
                          .toUpperCase()
                          .split("")
                          .filter((c) => /[A-Z]/.test(c))
                          .map((c, i) => {
                            const isVowel = "AEIOU".includes(c);
                            return (
                              <span
                                key={i}
                                className={`letter-chip ${isVowel ? "struck" : ""}`}
                                style={{ animationDelay: `${i * 0.03}s` }}
                              >
                                {c}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {animStep >= 2 && (
                    <div style={{ ...styles.processStep, animation: "fadeInUp 0.5s ease forwards", marginTop: 24 }}>
                      <span style={styles.processTitle}>Unique consonants — the essence:</span>
                      <div style={styles.letterRow}>
                        {uniqueLetters.map((c, i) => (
                          <span
                            key={i}
                            className="letter-chip"
                            style={{
                              animationDelay: `${i * 0.08}s`,
                              borderColor: "rgba(201,168,76,0.7)",
                              background: "rgba(201,168,76,0.1)",
                              fontSize: 16,
                              fontWeight: 600,
                            }}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {animStep >= 3 && (
                    <div style={{ textAlign: "center", marginTop: 28, animation: "fadeInUp 0.5s ease forwards" }}>
                      <span style={{ ...styles.processTitle, animation: "gentlePulse 1.5s ease infinite", display: "inline-block" }}>
                        Transmuting into symbol...
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!processing && (
                <button
                  className="btn"
                  style={{
                    ...styles.beginBtn,
                    opacity: desire.trim().length > 0 ? 1 : 0.3,
                    pointerEvents: desire.trim().length > 0 ? "auto" : "none",
                  }}
                  onClick={processDesire}
                >
                  Begin the Ritual
                </button>
              )}
            </div>
          ) : (
            <div style={{ ...styles.resultSection, animation: "fadeInUp 0.6s ease forwards" }}>
              <div style={styles.canvasWrapper}>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={600}
                  className="canvas-display"
                  style={styles.canvas}
                />
                <div style={styles.canvasCornerTL} />
                <div style={styles.canvasCornerTR} />
                <div style={styles.canvasCornerBL} />
                <div style={styles.canvasCornerBR} />
              </div>

              <p style={styles.resultDesire}>"{desire}"</p>
              <p style={styles.resultLetters}>{uniqueLetters.join(" · ")}</p>

              <div style={styles.actionRow}>
                {isPurchased || hasUnlimitedAccess ? (
                  <button className="btn" style={styles.downloadBtn} onClick={downloadSigil}>
                    ↓ Download Sigil (HD)
                  </button>
                ) : (
                  <button className="btn" style={styles.purchaseBtn} onClick={() => setShowPurchaseModal(true)}>
                    <span style={styles.purchaseBtnIcon}>⬡</span>
                    <span>Unlock & Download</span>
                  </button>
                )}
                <button className="link" style={styles.resetLink} onClick={reset}>
                  Forge another
                </button>
              </div>

              {!isPurchased && !hasUnlimitedAccess && (
                <p style={styles.previewNote}>
                  Preview only — purchase to receive the full resolution sigil without watermark
                </p>
              )}

              <p style={styles.instruction}>
                To charge the sigil: meditate upon it, then release attachment to the outcome.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* How It Works Section */}
      <section style={styles.howItWorks}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>The Ritual Process</h2>
          <div style={styles.processGrid}>
            <div style={styles.processCard}>
              <div style={styles.processNumber}>I</div>
              <h3 style={styles.processCardTitle}>Declare</h3>
              <p style={styles.processCardDesc}>State your intention with clarity. Be specific about what you desire to manifest.</p>
            </div>
            <div style={styles.processCard}>
              <div style={styles.processNumber}>II</div>
              <h3 style={styles.processCardTitle}>Purify</h3>
              <p style={styles.processCardDesc}>Vowels are stripped away, removing the breath and leaving only the structure.</p>
            </div>
            <div style={styles.processCard}>
              <div style={styles.processNumber}>III</div>
              <h3 style={styles.processCardTitle}>Distill</h3>
              <p style={styles.processCardDesc}>Duplicate letters dissolve, leaving only the unique essence of your desire.</p>
            </div>
            <div style={styles.processCard}>
              <div style={styles.processNumber}>IV</div>
              <h3 style={styles.processCardTitle}>Transmute</h3>
              <p style={styles.processCardDesc}>Letters become geometry. Geometry becomes symbol. Your sigil is born.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section style={styles.pricing}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Unlock Your Sigil</h2>
          <p style={styles.pricingSubtitle}>Choose how you want to access your creations</p>
          
          <div className="tier-grid" style={styles.tierGrid}>
            {TIERS.map((tier) => (
              <div key={tier.id} style={styles.tierCard}>
                {tier.badge && <div style={styles.tierBadge}>{tier.badge}</div>}
                <div style={styles.tierIcon}>{tier.icon}</div>
                <h3 style={styles.tierName}>{tier.name}</h3>
                <div style={styles.tierPrice}>
                  {tier.price}
                  {tier.sub && <span style={styles.tierPriceSub}>{tier.sub}</span>}
                </div>
                <p style={styles.tierDesc}>{tier.desc}</p>
                <ul style={styles.tierFeatures}>
                  {tier.features.map((f, i) => (
                    <li key={i} style={styles.tierFeature}>
                      <span style={styles.featureCheck}>✦</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.container}>
          <div style={styles.footerLine} />
          <p style={styles.footerQuote}>
            "The conscious mind must forget the sigil for it to work."
          </p>
          <div style={styles.footerLinks}>
            <a href="/privacy-policy.html" style={styles.footerLink}>Privacy Policy</a>
            <span style={styles.footerDivider}>·</span>
            <a href="/terms-of-service.html" style={styles.footerLink}>Terms of Service</a>
            <span style={styles.footerDivider}>·</span>
            <a href="/support.html" style={styles.footerLink}>Support</a>
          </div>
          <p style={styles.copyright}>© 2026 Axel Films Ltd. All rights reserved.</p>
        </div>
      </footer>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPurchaseModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowPurchaseModal(false)}>×</button>
            
            <div style={styles.modalHeader}>
              <div style={{ ...styles.headerLine, width: 60 }} />
              <h2 style={styles.modalTitle}>Unlock Your Sigil</h2>
              <div style={{ ...styles.headerLine, width: 60 }} />
            </div>

            <div style={styles.modalBody}>
              {/* Tier Selection */}
              <div style={styles.tierOptions}>
                {TIERS.map((tier) => (
                  <div
                    key={tier.id}
                    className={`tier-option ${selectedTier === tier.id ? "tier-selected" : ""}`}
                    style={{
                      ...styles.tierOption,
                      borderColor: selectedTier === tier.id ? "rgba(201,168,76,0.6)" : "rgba(201,168,76,0.15)",
                    }}
                    onClick={() => setSelectedTier(tier.id)}
                  >
                    <div style={styles.tierRadio}>
                      <div style={{
                        ...styles.tierRadioInner,
                        background: selectedTier === tier.id ? "#c9a84c" : "transparent",
                      }} />
                    </div>
                    <div style={styles.tierOptionIcon}>{tier.icon}</div>
                    <div style={styles.tierOptionInfo}>
                      <div style={styles.tierOptionName}>
                        {tier.name}
                        {tier.badge && <span style={styles.tierOptionBadge}>{tier.badge}</span>}
                      </div>
                      <div style={styles.tierOptionDesc}>{tier.desc}</div>
                    </div>
                    <div style={styles.tierOptionPrice}>
                      {tier.price}
                      {tier.sub && <span style={styles.tierOptionSub}>{tier.sub}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Features */}
              <div style={styles.modalFeatures}>
                {selectedTierData?.features.map((f, i) => (
                  <div key={i} style={styles.modalFeature}>
                    <span style={styles.featureCheck}>✦</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={styles.modalActions}>
                <button className="btn" style={styles.stripeBtn} onClick={handlePurchase}>
                  {selectedTier === "monthly" 
                    ? `Subscribe — ${selectedTierData?.price}/month`
                    : `Pay ${selectedTierData?.price}`
                  }
                </button>
                <p style={styles.stripeNote}>
                  Secure payment via Stripe
                </p>
                {selectedTier === "monthly" && (
                  <p style={styles.subTerms}>
                    Subscription renews monthly. Cancel anytime.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0a0a08",
    color: "#e8dcc8",
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
  
  // Success Banner
  successBanner: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: "16px 24px",
    background: "rgba(76, 168, 100, 0.15)",
    borderBottom: "1px solid rgba(76, 168, 100, 0.3)",
    color: "#7dba8c",
    fontFamily: "'Cinzel', serif",
    fontSize: 14,
    letterSpacing: 1,
    animation: "successSlide 0.5s ease forwards",
  },
  
  // Hero
  hero: {
    minHeight: "40vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "80px 20px 60px",
    background: "radial-gradient(ellipse at center, rgba(201,168,76,0.03) 0%, transparent 70%)",
  },
  heroContent: {
    maxWidth: 600,
  },
  headerLine: {
    width: 120,
    height: 1,
    background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)",
    margin: "12px auto",
  },
  heroTitle: {
    fontFamily: "'Cinzel', serif",
    fontSize: 48,
    fontWeight: 400,
    letterSpacing: 14,
    color: "#c9a84c",
    margin: "8px 0",
    textShadow: "0 0 60px rgba(201,168,76,0.15)",
  },
  heroSubtitle: {
    fontSize: 18,
    fontWeight: 300,
    fontStyle: "italic",
    color: "rgba(232,220,200,0.5)",
    letterSpacing: 4,
  },
  accessBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    padding: "10px 20px",
    background: "rgba(201,168,76,0.1)",
    border: "1px solid rgba(201,168,76,0.3)",
    fontFamily: "'Cinzel', serif",
    fontSize: 12,
    letterSpacing: 2,
    color: "#c9a84c",
  },
  
  // Main
  main: {
    padding: "40px 20px 80px",
  },
  container: {
    maxWidth: 900,
    margin: "0 auto",
  },
  
  // Steps
  stepsRow: {
    display: "flex",
    gap: 16,
    marginBottom: 50,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  stepItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: "1 1 180px",
    maxWidth: 200,
    transition: "opacity 0.6s ease",
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    border: "1px solid",
    marginBottom: 10,
    transition: "all 0.4s ease",
  },
  stepLabel: {
    fontFamily: "'Cinzel', serif",
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 6,
    transition: "color 0.4s ease",
    textAlign: "center",
  },
  stepDesc: {
    fontSize: 13,
    color: "rgba(232,220,200,0.3)",
    textAlign: "center",
    lineHeight: 1.5,
    fontStyle: "italic",
  },
  
  // Input
  inputSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: 600,
    margin: "0 auto",
  },
  inputLabel: {
    fontFamily: "'Cinzel', serif",
    fontSize: 14,
    letterSpacing: 3,
    color: "rgba(201,168,76,0.7)",
    marginBottom: 20,
    textAlign: "center",
  },
  textarea: {
    width: "100%",
    minHeight: 140,
    background: "rgba(201,168,76,0.03)",
    border: "1px solid rgba(201,168,76,0.2)",
    color: "#e8dcc8",
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 22,
    fontWeight: 300,
    padding: "24px",
    resize: "vertical",
    lineHeight: 1.6,
    letterSpacing: 1,
    transition: "all 0.4s ease",
  },
  charCount: {
    alignSelf: "flex-end",
    fontSize: 12,
    color: "rgba(201,168,76,0.25)",
    marginTop: 8,
    fontFamily: "'Cinzel', serif",
    letterSpacing: 1,
  },
  processBox: {
    width: "100%",
    marginTop: 40,
    padding: "28px 24px",
    border: "1px solid rgba(201,168,76,0.1)",
    background: "rgba(201,168,76,0.02)",
  },
  processStep: {},
  processTitle: {
    fontFamily: "'Cinzel', serif",
    fontSize: 12,
    letterSpacing: 2,
    color: "rgba(201,168,76,0.6)",
    display: "block",
    marginBottom: 16,
    textAlign: "center",
  },
  letterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 0,
    justifyContent: "center",
  },
  beginBtn: {
    marginTop: 40,
    padding: "16px 56px",
    background: "rgba(201,168,76,0.08)",
    border: "1px solid rgba(201,168,76,0.4)",
    color: "#c9a84c",
    fontFamily: "'Cinzel', serif",
    fontSize: 15,
    letterSpacing: 4,
    cursor: "pointer",
    textTransform: "uppercase",
    transition: "all 0.4s ease",
  },
  
  // Result
  resultSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  canvasWrapper: {
    position: "relative",
    display: "inline-block",
    animation: "pulseGlow 3s ease infinite",
  },
  canvas: {
    width: 400,
    height: 400,
    display: "block",
  },
  canvasCornerTL: { position: "absolute", top: -4, left: -4, width: 24, height: 24, borderTop: "1px solid rgba(201,168,76,0.4)", borderLeft: "1px solid rgba(201,168,76,0.4)" },
  canvasCornerTR: { position: "absolute", top: -4, right: -4, width: 24, height: 24, borderTop: "1px solid rgba(201,168,76,0.4)", borderRight: "1px solid rgba(201,168,76,0.4)" },
  canvasCornerBL: { position: "absolute", bottom: -4, left: -4, width: 24, height: 24, borderBottom: "1px solid rgba(201,168,76,0.4)", borderLeft: "1px solid rgba(201,168,76,0.4)" },
  canvasCornerBR: { position: "absolute", bottom: -4, right: -4, width: 24, height: 24, borderBottom: "1px solid rgba(201,168,76,0.4)", borderRight: "1px solid rgba(201,168,76,0.4)" },
  resultDesire: {
    marginTop: 28,
    fontSize: 20,
    fontStyle: "italic",
    color: "rgba(232,220,200,0.5)",
    textAlign: "center",
    maxWidth: 500,
    lineHeight: 1.5,
  },
  resultLetters: {
    marginTop: 10,
    fontFamily: "'Cinzel', serif",
    fontSize: 15,
    letterSpacing: 8,
    color: "rgba(201,168,76,0.5)",
  },
  actionRow: {
    display: "flex",
    alignItems: "center",
    gap: 28,
    marginTop: 36,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  downloadBtn: {
    padding: "14px 40px",
    background: "rgba(201,168,76,0.1)",
    border: "1px solid rgba(201,168,76,0.5)",
    color: "#c9a84c",
    fontFamily: "'Cinzel', serif",
    fontSize: 14,
    letterSpacing: 3,
    cursor: "pointer",
    textTransform: "uppercase",
    transition: "all 0.3s ease",
  },
  purchaseBtn: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 44px",
    background: "rgba(201,168,76,0.12)",
    border: "2px solid rgba(201,168,76,0.6)",
    color: "#c9a84c",
    fontFamily: "'Cinzel', serif",
    fontSize: 15,
    letterSpacing: 3,
    cursor: "pointer",
    textTransform: "uppercase",
    transition: "all 0.3s ease",
  },
  purchaseBtnIcon: { fontSize: 20, opacity: 0.7 },
  resetLink: {
    background: "none",
    border: "none",
    color: "rgba(232,220,200,0.4)",
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 16,
    fontStyle: "italic",
    cursor: "pointer",
    transition: "color 0.3s ease",
    textDecoration: "underline",
    textUnderlineOffset: 4,
  },
  previewNote: {
    marginTop: 24,
    fontSize: 14,
    fontStyle: "italic",
    color: "rgba(201,168,76,0.35)",
    textAlign: "center",
    fontFamily: "'Cinzel', serif",
    letterSpacing: 1,
  },
  instruction: {
    marginTop: 48,
    fontSize: 15,
    fontStyle: "italic",
    color: "rgba(232,220,200,0.25)",
    textAlign: "center",
    maxWidth: 400,
    lineHeight: 1.6,
  },
  
  // How It Works
  howItWorks: {
    padding: "80px 20px",
    background: "rgba(201,168,76,0.02)",
    borderTop: "1px solid rgba(201,168,76,0.1)",
    borderBottom: "1px solid rgba(201,168,76,0.1)",
  },
  sectionTitle: {
    fontFamily: "'Cinzel', serif",
    fontSize: 28,
    fontWeight: 400,
    letterSpacing: 6,
    color: "#c9a84c",
    textAlign: "center",
    marginBottom: 50,
  },
  processGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 32,
    maxWidth: 900,
    margin: "0 auto",
  },
  processCard: {
    textAlign: "center",
    padding: "32px 24px",
  },
  processNumber: {
    fontFamily: "'Cinzel', serif",
    fontSize: 32,
    color: "rgba(201,168,76,0.3)",
    marginBottom: 16,
  },
  processCardTitle: {
    fontFamily: "'Cinzel', serif",
    fontSize: 18,
    letterSpacing: 3,
    color: "#c9a84c",
    marginBottom: 12,
  },
  processCardDesc: {
    fontSize: 15,
    color: "rgba(232,220,200,0.5)",
    lineHeight: 1.6,
    fontStyle: "italic",
  },
  
  // Pricing
  pricing: {
    padding: "80px 20px",
  },
  pricingSubtitle: {
    textAlign: "center",
    fontSize: 16,
    fontStyle: "italic",
    color: "rgba(232,220,200,0.4)",
    marginTop: -30,
    marginBottom: 50,
  },
  tierGrid: {
    display: "flex",
    gap: 24,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  tierCard: {
    flex: "1 1 260px",
    maxWidth: 300,
    padding: "40px 32px",
    background: "rgba(201,168,76,0.03)",
    border: "1px solid rgba(201,168,76,0.15)",
    textAlign: "center",
    position: "relative",
  },
  tierBadge: {
    position: "absolute",
    top: -12,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "6px 16px",
    background: "#c9a84c",
    color: "#0a0a08",
    fontFamily: "'Cinzel', serif",
    fontSize: 10,
    letterSpacing: 2,
  },
  tierIcon: {
    fontSize: 36,
    color: "rgba(201,168,76,0.5)",
    marginBottom: 16,
  },
  tierName: {
    fontFamily: "'Cinzel', serif",
    fontSize: 18,
    letterSpacing: 2,
    color: "#c9a84c",
    marginBottom: 8,
  },
  tierPrice: {
    fontFamily: "'Cinzel', serif",
    fontSize: 36,
    fontWeight: 600,
    color: "#c9a84c",
    marginBottom: 8,
  },
  tierPriceSub: {
    fontSize: 16,
    fontWeight: 400,
    color: "rgba(201,168,76,0.5)",
  },
  tierDesc: {
    fontSize: 14,
    fontStyle: "italic",
    color: "rgba(232,220,200,0.4)",
    marginBottom: 24,
  },
  tierFeatures: {
    listStyle: "none",
    textAlign: "left",
  },
  tierFeature: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    color: "rgba(232,220,200,0.6)",
    marginBottom: 10,
  },
  featureCheck: {
    color: "#c9a84c",
    fontSize: 12,
  },
  
  // Footer
  footer: {
    padding: "60px 20px",
    textAlign: "center",
    borderTop: "1px solid rgba(201,168,76,0.1)",
  },
  footerLine: {
    width: 60,
    height: 1,
    background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)",
    margin: "0 auto 24px",
  },
  footerQuote: {
    fontSize: 15,
    fontStyle: "italic",
    color: "rgba(232,220,200,0.3)",
    marginBottom: 24,
  },
  footerLinks: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  footerLink: {
    color: "rgba(201,168,76,0.4)",
    textDecoration: "none",
    fontSize: 13,
    fontFamily: "'Cinzel', serif",
    letterSpacing: 1,
    transition: "color 0.3s ease",
  },
  footerDivider: {
    color: "rgba(201,168,76,0.2)",
  },
  copyright: {
    fontSize: 12,
    color: "rgba(232,220,200,0.2)",
  },
  
  // Modal
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: "#111110",
    border: "1px solid rgba(201,168,76,0.3)",
    maxWidth: 480,
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    padding: "40px 36px",
    animation: "modalIn 0.4s ease forwards",
    position: "relative",
  },
  modalClose: {
    position: "absolute",
    top: 16,
    right: 20,
    background: "none",
    border: "none",
    color: "rgba(232,220,200,0.3)",
    fontSize: 28,
    cursor: "pointer",
    lineHeight: 1,
  },
  modalHeader: {
    textAlign: "center",
    marginBottom: 32,
  },
  modalTitle: {
    fontFamily: "'Cinzel', serif",
    fontSize: 22,
    fontWeight: 400,
    letterSpacing: 4,
    color: "#c9a84c",
    margin: "8px 0",
  },
  modalBody: {},
  tierOptions: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 28,
  },
  tierOption: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 18px",
    border: "1px solid rgba(201,168,76,0.15)",
    transition: "all 0.2s ease",
  },
  tierRadio: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: "1.5px solid rgba(201,168,76,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tierRadioInner: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    transition: "background 0.2s ease",
  },
  tierOptionIcon: {
    fontSize: 20,
    color: "rgba(201,168,76,0.6)",
    width: 28,
    textAlign: "center",
    flexShrink: 0,
  },
  tierOptionInfo: {
    flex: 1,
  },
  tierOptionName: {
    fontFamily: "'Cinzel', serif",
    fontSize: 14,
    color: "#c9a84c",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  tierOptionBadge: {
    fontSize: 8,
    letterSpacing: 1,
    padding: "2px 8px",
    background: "#c9a84c",
    color: "#0a0a08",
  },
  tierOptionDesc: {
    fontSize: 12,
    fontStyle: "italic",
    color: "rgba(232,220,200,0.4)",
    marginTop: 2,
  },
  tierOptionPrice: {
    fontFamily: "'Cinzel', serif",
    fontSize: 16,
    fontWeight: 600,
    color: "#c9a84c",
    textAlign: "right",
  },
  tierOptionSub: {
    display: "block",
    fontSize: 11,
    fontWeight: 400,
    color: "rgba(201,168,76,0.5)",
  },
  modalFeatures: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 28,
    padding: "20px 0",
    borderTop: "1px solid rgba(201,168,76,0.1)",
    borderBottom: "1px solid rgba(201,168,76,0.1)",
  },
  modalFeature: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    color: "rgba(232,220,200,0.6)",
    justifyContent: "center",
  },
  errorBox: {
    padding: "12px 16px",
    background: "rgba(211,95,95,0.1)",
    border: "1px solid rgba(211,95,95,0.3)",
    color: "#d35f5f",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  modalActions: {
    textAlign: "center",
  },
  stripeBtn: {
    width: "100%",
    padding: "16px 32px",
    background: "rgba(201,168,76,0.2)",
    border: "1px solid rgba(201,168,76,0.6)",
    color: "#c9a84c",
    fontFamily: "'Cinzel', serif",
    fontSize: 15,
    letterSpacing: 2,
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  stripeNote: {
    fontSize: 12,
    color: "rgba(232,220,200,0.3)",
    marginTop: 12,
  },
  subTerms: {
    fontSize: 11,
    color: "rgba(232,220,200,0.25)",
    marginTop: 8,
  },
  processingPayment: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: "20px 0",
    color: "rgba(201,168,76,0.6)",
    fontFamily: "'Cinzel', serif",
    fontSize: 13,
    letterSpacing: 2,
  },
  spinner: {
    width: 20,
    height: 20,
    border: "2px solid rgba(201,168,76,0.2)",
    borderTopColor: "#c9a84c",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};
