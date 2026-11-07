"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Media , PERFORMERS , EVENT_PHOTOS } from "@/data/info/gallary";


/* -------------------------------------------------------------------------- */
/*  Styles                                                                     */
/* -------------------------------------------------------------------------- */

const CSS = `
.gn { --bg:transparent; --ink:#F5F0DE; --mute:rgba(245,240,222,.58); --line:rgba(85,223,255,.28); --cyan:#55DFFF; --ease:cubic-bezier(.2,.7,.2,1);
  position:relative; isolation:isolate; overflow:hidden; background:transparent; color:var(--ink);
  font-family:var(--font-gotham-book,"Gotham Book"),"Segoe UI",system-ui,sans-serif;
  padding:clamp(64px,9vw,120px) clamp(14px,4vw,48px) clamp(72px,9vw,120px); --s:0; }
.gn *,.gn *::before,.gn *::after{box-sizing:border-box}

.gn-sky{position:absolute;inset:-15% 0;z-index:-1;pointer-events:none}
.gn-sky i{position:absolute;inset:0;display:block;will-change:transform}
.gn-sky .neb{background:
  radial-gradient(55% 35% at 12% 15%,rgba(85,223,255,.10),transparent 70%),
  radial-gradient(50% 35% at 92% 55%,rgba(255,128,110,.07),transparent 70%),
  radial-gradient(55% 30% at 25% 95%,rgba(143,227,136,.06),transparent 70%);
  transform:translate3d(0,calc(var(--s)*-.04px),0)}
.gn-sky .far{background-image:
  radial-gradient(1px 1px at 12% 18%,#fff9,transparent 60%),radial-gradient(1px 1px at 38% 62%,#fff8,transparent 60%),
  radial-gradient(1px 1px at 71% 28%,#fffa,transparent 60%),radial-gradient(1px 1px at 88% 74%,#fff8,transparent 60%),
  radial-gradient(1px 1px at 55% 90%,#fff9,transparent 60%);background-size:420px 420px;
  transform:translate3d(0,calc(var(--s)*-.03px),0)}
.gn-sky .near{background-image:
  radial-gradient(1.6px 1.6px at 22% 34%,#c8d4ff,transparent 60%),radial-gradient(1.6px 1.6px at 64% 12%,#fff,transparent 60%),
  radial-gradient(1.6px 1.6px at 82% 58%,#dccbff,transparent 60%),radial-gradient(1.6px 1.6px at 40% 84%,#c8d4ff,transparent 60%);
  background-size:640px 640px;transform:translate3d(0,calc(var(--s)*-.08px),0)}

.gn-wrap{position:relative;max-width:1180px;margin:0 auto}
.gn-top{margin:0 0 clamp(48px,7vw,88px);max-width:560px}
.gn-top h2{margin:0;font-family:var(--font-gotham-bold,"Gotham Bold"),sans-serif;font-size:clamp(30px,5vw,52px);font-weight:600;letter-spacing:-.02em;line-height:1.1}
.gn-top p{margin:14px 0 0;color:var(--mute);font-size:clamp(14px,1.5vw,16px);line-height:1.7}

.gn-sec{margin:0 0 clamp(72px,10vw,140px)}
.gn-sec:last-child{margin-bottom:0}
.gn-sec-h{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;
  padding-bottom:14px;margin-bottom:clamp(26px,4vw,48px);border-bottom:1px solid var(--line)}
.gn-sec-h h3{margin:0;font-family:var(--font-gotham-bold,"Gotham Bold"),sans-serif;font-size:clamp(20px,2.6vw,28px);font-weight:600;letter-spacing:-.01em}
.gn-sec-h span{color:var(--mute);font-size:13px;letter-spacing:.06em}

/* Honeycomb of performers */
.hc{perspective:1500px}
.hc-plane{position:relative;margin:0 auto;transform-style:preserve-3d;
  transform:rotateX(calc(var(--p,0)*7deg));will-change:transform}
.hx{position:absolute;padding:0;border:0;cursor:pointer;color:inherit;background:linear-gradient(145deg,#55DFFF,#168DB5 55%,#55DFFF);
  clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);
  opacity:0;transform:translate3d(0,46px,-140px) scale(.88);
  transition:opacity .55s var(--ease) var(--d),transform .55s var(--ease) var(--d);
  -webkit-tap-highlight-color:transparent}
.hc-plane.in .hx{opacity:1;transform:translate3d(0,0,0) scale(1)}
.hc-plane.settled .hx{transition:opacity .2s ease-out;transition-delay:0s}
.hx:hover,.hx:focus-visible{z-index:10;outline:1px solid #55DFFF;outline-offset:2px}
.hx:focus-visible{outline:2px solid #55DFFF;outline-offset:3px}
.hx-in{position:absolute;inset:2px;overflow:hidden;background:#09151B;
  clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)}
.hx-in img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 25%;transition:transform .3s ease-out}
.hx:hover .hx-in img,.hx:focus-visible .hx-in img{transform:scale(1.04)}
.hx-fade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,transparent 30%,rgba(9,21,27,.96));opacity:0;transition:opacity .15s ease-out}
.hx:hover .hx-fade,.hx:focus-visible .hx-fade{opacity:1}
.hx-cap{position:absolute;left:10%;right:10%;bottom:17%;z-index:2;pointer-events:none;text-align:center;opacity:0;transform:translateY(4px);transition:opacity .15s ease-out,transform .15s ease-out}
.hx:hover .hx-cap,.hx:focus-visible .hx-cap{opacity:1;transform:translateY(0)}
.hx-cap b{display:block;font-weight:600;font-size:clamp(11px,1.25vw,15px);line-height:1.25}
.hx-cap em{display:block;margin-top:3px;font-style:normal;color:#55DFFF;font-size:clamp(10px,1vw,12px);letter-spacing:.14em}
.play{position:absolute;left:50%;top:14%;width:26px;height:26px;margin-left:-13px;border-radius:50%;
  background:rgba(9,21,27,.78);border:1px solid rgba(85,223,255,.55)}
.play::after{content:"";position:absolute;left:10px;top:7px;border-style:solid;border-width:5px 0 5px 8px;border-color:transparent transparent transparent #fff}
@media (hover:none){.hx-fade{opacity:1}.hx-cap{opacity:1;transform:none}}

/* Event photographs: two to four tilted columns with pentagon cut frames */
.pw{perspective:1600px;display:flex;gap:16px;align-items:flex-start;justify-content:center}
.pc{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:14px;will-change:transform;
  transform:translate3d(0,calc(var(--p,0)*var(--k,0)*1px),0) rotateY(var(--ry,0deg))}
.pt{position:relative;display:block;width:100%;padding:0;border:0;cursor:pointer;color:inherit;background:#09151B;
  clip-path:polygon(0 0,100% 0,100% calc(100% - 26px),50% 100%,0 calc(100% - 26px));
  opacity:0;transform:translate3d(0,50px,-90px) rotateX(12deg);transform-origin:50% 100%;
  transition:opacity .8s var(--ease),transform .9s var(--ease);-webkit-tap-highlight-color:transparent}
.pt.in{opacity:1;transform:none}
.pt img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .9s var(--ease)}
.pt:hover img{transform:scale(1.05)}
.pt:focus-visible{outline:2px solid #55DFFF;outline-offset:3px}
.pt-cap{position:absolute;left:0;right:0;bottom:0;padding:34px 14px 34px;text-align:left;
  background:linear-gradient(180deg,transparent,rgba(9,21,27,.92));opacity:0;transition:opacity .14s ease-out}
.pt:hover .pt-cap,.pt:focus-visible .pt-cap{opacity:1}
.pt-cap b{display:block;font-size:13px;font-weight:600}
.pt-cap em{font-style:normal;color:#55DFFF;font-size:11px;letter-spacing:.14em}
@media (hover:none){.pt-cap{opacity:1}}

/* Viewer */
.vw{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:rgba(4,10,14,.96);animation:vwin .3s ease both;touch-action:pan-y}
@keyframes vwin{from{opacity:0}to{opacity:1}}
@keyframes vwpop{from{opacity:0;transform:scale(.96) translate3d(0,14px,0)}to{opacity:1;transform:none}}
.vw-stage{flex:1 1 auto;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;padding:64px 16px 8px}
.vw-stage img,.vw-stage video{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:6px;
  animation:vwpop .45s var(--ease) both}
.vw-info{flex:0 0 auto;padding:10px 20px 28px;text-align:center}
.vw-info b{display:block;font-size:17px;font-weight:600}
.vw-info span{display:block;margin-top:4px;color:var(--mute);font-size:13px;letter-spacing:.14em}
.vw-b{position:absolute;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;cursor:pointer;color:#fff;
  background:rgba(9,21,27,.82);border:1px solid rgba(85,223,255,.35);transition:background .18s;-webkit-tap-highlight-color:transparent}
.vw-b:hover{background:rgba(85,223,255,.18)}
.vw-b:focus-visible{outline:2px solid #55DFFF;outline-offset:2px}
.vw-b svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.vw-x{top:12px;right:12px}.vw-l{left:10px;top:50%;margin-top:-34px}.vw-r{right:10px;top:50%;margin-top:-34px}
@media (min-width:900px){.vw-stage{padding:56px 110px 8px}.vw-l{left:28px}.vw-r{right:28px}}

@media (prefers-reduced-motion:reduce){
  .hx,.pt{opacity:1!important;transform:none!important;transition:none!important}
  .hc-plane,.pc{transform:none!important}.gn-sky i{transform:none!important}
  .vw,.vw-stage img,.vw-stage video{animation:none}
}
`;

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                      */
/* -------------------------------------------------------------------------- */

function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/* Writes --p (range minus one to one) on the element while it is on screen */
function useProgress(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visible = false;
    let ticking = false;
    const calc = () => {
      ticking = false;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = ((r.top + r.height / 2) - vh / 2) / (vh / 2 + r.height / 2);
      el.style.setProperty("--p", Math.max(-1, Math.min(1, p)).toFixed(3));
    };
    const onScroll = () => {
      if (visible && !ticking) {
        ticking = true;
        requestAnimationFrame(calc);
      }
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) calc();
    }, { rootMargin: "20% 0px" });
    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref]);
}

/* -------------------------------------------------------------------------- */
/*  Honeycomb of connected hexagons                                            */
/* -------------------------------------------------------------------------- */

const Honeycomb: React.FC<{ items: Media[]; onOpen: (i: number, el: HTMLElement) => void }> = ({ items, onOpen }) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const planeRef = useRef<HTMLDivElement | null>(null);
  const width = useWidth(boxRef);
  useProgress(planeRef);

  const cols = width < 520 ? 2 : width < 860 ? 3 : width < 1180 ? 4 : 5;
  const gap = width < 520 ? 9 : 14;
  const w = (width - gap * (cols - 0.5)) / (cols + 0.5);
  const h = w * 1.1547;
  const rows = Math.ceil(items.length / cols);
  const total = h + (rows - 1) * (w * 0.866 + gap);

  useEffect(() => {
    const el = planeRef.current;
    if (!el || !width) return;
    el.classList.remove("in", "settled");
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.classList.add("in");
        window.setTimeout(() => el.classList.add("settled"), 2200);
        io.disconnect();
      }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, [cols, width]);

  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;

  return (
    <div className="hc" ref={boxRef}>
      {width > 0 && (
        <div className="hc-plane" ref={planeRef} style={{ width, height: total }}>
          {items.map((it, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const dist = Math.hypot(c - cx, r - cy);
            return (
              <button
                key={it.id}
                type="button"
                className="hx"
                aria-label={`${it.title}, ${it.year}`}
                style={{
                  left: c * (w + gap) + (r % 2 ? (w + gap) / 2 : 0),
                  top: r * (w * 0.866 + gap),
                  width: w,
                  height: h,
                  ["--d" as string]: `${Math.round(dist * 90)}ms`,
                }}
                onClick={(e) => onOpen(i, e.currentTarget)}
              >
                <span className="hx-in">
                  <img src={it.src} alt={it.title} loading="lazy" decoding="async" draggable={false} width={it.width} height={it.height} />
                  <span className="hx-fade" />
                  {it.video && <span className="play" aria-hidden="true" />}
                  <span className="hx-cap">
                    <b>{it.title}</b>
                    <em>{it.year}</em>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Event photographs, tilted columns with scroll depth                        */
/* -------------------------------------------------------------------------- */

const PhotoWall: React.FC<{ items: Media[]; onOpen: (i: number, el: HTMLElement) => void }> = ({ items, onOpen }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const width = useWidth(ref);
  useProgress(ref);

  const count = width < 640 ? 2 : width < 1000 ? 3 : 4;

  const columns = useMemo(() => {
    const cols: { idx: number; h: number }[][] = Array.from({ length: count }, () => []);
    const heights = new Array(count).fill(0);
    items.forEach((it, idx) => {
      let s = 0;
      for (let k = 1; k < count; k++) if (heights[k] < heights[s] - 0.001) s = k;
      cols[s].push({ idx, h: it.height / it.width });
      heights[s] += it.height / it.width;
    });
    return cols;
  }, [items, count]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !width) return;
    const tiles = Array.from(el.querySelectorAll<HTMLElement>(".pt"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    tiles.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [columns, width]);

  const ks = [34, -34, 22, -22];
  const rys = [4, 1.5, -1.5, -4];

  return (
    <div className="pw" ref={ref}>
      {width > 0 &&
        columns.map((col, ci) => {
          const ry = count === 2 ? (ci === 0 ? 3 : -3) : count === 3 ? [3.5, 0, -3.5][ci] : rys[ci];
          return (
            <div key={ci} className="pc" style={{ ["--k" as string]: ks[ci % 4], ["--ry" as string]: `${ry}deg` }}>
              {col.map(({ idx }) => {
                const it = items[idx];
                return (
                  <button
                    key={it.id}
                    type="button"
                    className="pt"
                    aria-label={`${it.title}, ${it.year}`}
                    style={{ aspectRatio: `${it.width} / ${it.height}` }}
                    onClick={(e) => onOpen(idx, e.currentTarget)}
                  >
                    <img src={it.src} alt={it.title} loading="lazy" decoding="async" draggable={false} width={it.width} height={it.height} />
                    <span className="pt-cap">
                      <b>{it.title}</b>
                      <em>{it.year}</em>
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Viewer                                                                     */
/* -------------------------------------------------------------------------- */

const Arrow = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
);

const Viewer: React.FC<{ items: Media[]; index: number; onClose: () => void; onStep: (d: 1 | -1) => void }> = ({
  items,
  index,
  onClose,
  onStep,
}) => {
  const item = items[index];
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onStep(1);
      else if (e.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", key);
    };
  }, [onClose, onStep]);

  useEffect(() => {
    [1, -1].forEach((d) => {
      const n = items[(index + d + items.length) % items.length];
      if (n && !n.video) new Image().src = n.src;
    });
  }, [index, items]);

  return (
    <div
      className="vw"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title}, ${item.year}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (startX.current === null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 60) onStep(dx < 0 ? 1 : -1);
      }}
    >
      <button ref={closeRef} type="button" className="vw-b vw-x" onClick={onClose} aria-label="Close">
        <Arrow d="M6 6l12 12M18 6L6 18" />
      </button>
      {items.length > 1 && (
        <>
          <button type="button" className="vw-b vw-l" onClick={() => onStep(-1)} aria-label="Previous">
            <Arrow d="M15 5l-7 7 7 7" />
          </button>
          <button type="button" className="vw-b vw-r" onClick={() => onStep(1)} aria-label="Next">
            <Arrow d="M9 5l7 7-7 7" />
          </button>
        </>
      )}
      <div className="vw-stage" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {item.video ? (
          <video key={item.id} src={item.video} poster={item.src} controls autoPlay playsInline />
        ) : (
          <img key={item.id} src={item.src} alt={item.title} />
        )}
      </div>
      <div className="vw-info">
        <b>{item.title}</b>
        <span>{item.year}</span>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

const range = (list: Media[]) => {
  const ys = list.map((i) => i.year);
  const a = Math.min(...ys);
  const b = Math.max(...ys);
  return a === b ? String(a) : `${a} to ${b}`;
};

const Galarynew: React.FC = () => {
  const rootRef = useRef<HTMLElement | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const [view, setView] = useState<{ list: Media[]; index: number } | null>(null);

  /* Background drift, one write per frame */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      el.style.setProperty("--s", String(Math.round(-el.getBoundingClientRect().top)));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const open = (list: Media[]) => (index: number, el: HTMLElement) => {
    lastFocus.current = el;
    setView({ list, index });
  };
  const close = useCallback(() => {
    setView(null);
    lastFocus.current?.focus?.();
  }, []);
  const step = useCallback((d: 1 | -1) => {
    setView((v) => (v ? { ...v, index: (v.index + d + v.list.length) % v.list.length } : v));
  }, []);

  return (
    <section ref={rootRef} className="gn" aria-label="Gallery">
      <style>{CSS}</style>

      <div className="gn-sky" aria-hidden="true">
        <i className="neb" />
        <i className="far" />
        <i className="near" />
      </div>

      <div className="gn-wrap">
        <div className="gn-top">
          <h2>Gallery</h2>
          <p>The artists who performed on our stage and the moments we captured along the way.</p>
        </div>

        <div className="gn-sec">
          <div className="gn-sec-h">
            <h3>Past Performers</h3>
            <span>{range(PERFORMERS)}</span>
          </div>
          <Honeycomb items={PERFORMERS} onOpen={open(PERFORMERS)} />
        </div>

        <div className="gn-sec">
          <div className="gn-sec-h">
            <h3>Event Photographs</h3>
            <span>{range(EVENT_PHOTOS)}</span>
          </div>
          <PhotoWall items={EVENT_PHOTOS} onOpen={open(EVENT_PHOTOS)} />
        </div>
      </div>

      {view && <Viewer items={view.list} index={view.index} onClose={close} onStep={step} />}
    </section>
  );
};

export default Galarynew;