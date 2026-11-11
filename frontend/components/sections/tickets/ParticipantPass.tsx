"use client";

import Image from "next/image";
import { memo, useId, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import styles from "./ParticipantPass.module.css";

export type ParticipantPassProps = {
  name: string;
  techxetraId: string;
  category: string;
  events: string[];
  qrValue: string;
  ticketNumber: string;
  dates?: string;
  venue?: string;
  logoSrc?: string;
};

function makeBars(seed: string) {
  let s = 2166136261;

  for (let i = 0; i < seed.length; i += 1) {
    s ^= seed.charCodeAt(i);
    s = Math.imul(s, 16777619);
  }

  s >>>= 0;
  if (!s) s = 1;

  const next = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };

  const bars: { y: number; h: number }[] = [];
  let y = 0;

  while (y < 200) {
    const h = 1 + Math.floor(next() * 4);
    const gap = 1 + Math.floor(next() * 3);

    bars.push({ y, h: Math.min(h, 200 - y) });
    y += h + gap;
  }

  return bars;
}

function Wordmark({ logoSrc }: { logoSrc?: string }) {
  const gid = useId();

  if (logoSrc) {
    return (
      <Image
        src={logoSrc}
        alt="TechXetra"
        width={320}
        height={84}
        priority
        className={styles.logoImg}
      />
    );
  }

  return (
    <span className={styles.wordmark} aria-label="TechXetra">
      <span aria-hidden="true">TECH</span>

      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className={styles.star}
      >
        <defs>
          <linearGradient
            id={`${gid}-star`}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#c6cadb" />
            <stop offset="1" stopColor="#7a7f96" />
          </linearGradient>
        </defs>

        <path
          d="M50 0C53 34 66 47 100 50C66 53 53 66 50 100C47 66 34 53 0 50C34 47 47 34 50 0Z"
          fill={`url(#${gid}-star)`}
          transform="rotate(-12 50 50)"
        />
      </svg>

      <span aria-hidden="true">ETRA</span>
    </span>
  );
}

function Decoration() {
  const gid = useId();

  return (
    <svg
      aria-hidden="true"
      className={styles.deco}
      viewBox="0 0 1477 679"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <radialGradient id={`${gid}-neb`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#2fb6d6" stopOpacity="0.38" />
          <stop offset="1" stopColor="#2fb6d6" stopOpacity="0" />
        </radialGradient>

        <linearGradient
          id={`${gid}-orbit`}
          x1="0"
          y1="1"
          x2="1"
          y2="0"
        >
          <stop offset="0" stopColor="#2f8fd0" stopOpacity="0.75" />
          <stop offset="1" stopColor="#7a63e8" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      <ellipse
        cx="800"
        cy="250"
        rx="190"
        ry="62"
        fill={`url(#${gid}-neb)`}
        transform="rotate(-18 800 250)"
      />

      <ellipse
        cx="880"
        cy="405"
        rx="500"
        ry="188"
        stroke={`url(#${gid}-orbit)`}
        strokeWidth="1.6"
        transform="rotate(-10 880 405)"
      />

      <path
        d="M1140 660C1150 430 1300 300 1477 230"
        stroke="#6f62e6"
        strokeOpacity="0.45"
        strokeWidth="1.4"
      />

      <path
        d="M605 205C700 335 1000 480 1300 482"
        stroke="#8fb4ff"
        strokeOpacity="0.5"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="0.1 9"
      />

      <g stroke="#a9bcf5" strokeOpacity="0.5" strokeWidth="1.2">
        <path d="M816 70L895 130L980 78L1058 148L895 130" />
        <path d="M980 78L1087 63L1058 148" />
        <path d="M884 637L963 580L1042 630L1096 565L963 580" />
      </g>

      <g fill="#e6efff">
        <circle cx="816" cy="70" r="4.5" />
        <circle cx="895" cy="130" r="4.5" />
        <circle className={styles.tw} cx="980" cy="78" r="5" />
        <circle cx="1058" cy="148" r="4.5" />
        <circle cx="1087" cy="63" r="4.5" />
        <circle cx="884" cy="637" r="4.5" />
        <circle className={styles.tw2} cx="963" cy="580" r="5" />
        <circle cx="1042" cy="630" r="4.5" />
        <circle cx="1096" cy="565" r="4.5" />
        <circle cx="72" cy="634" r="2.2" opacity="0.7" />
        <circle cx="1410" cy="632" r="2" opacity="0.7" />
        <circle cx="1332" cy="188" r="2" opacity="0.6" />
        <circle cx="725" cy="34" r="2" opacity="0.6" />
      </g>

      <g stroke="#9fe6ff" strokeOpacity="0.7" strokeWidth="1.4">
        <circle cx="980" cy="78" r="11" />
        <circle cx="963" cy="580" r="11" />
      </g>
    </svg>
  );
}

function ParticipantPassBase({
  name,
  techxetraId,
  category,
  events,
  qrValue,
  ticketNumber,
  dates = "29, 30 & 31 January 2027",
  venue = "Tezpur University, Assam",
  logoSrc,
}: ParticipantPassProps) {
  const bars = useMemo(
    () => makeBars(ticketNumber || "techxetra"),
    [ticketNumber]
  );

  const shortNo = (ticketNumber || "")
    .replace(/-/g, "")
    .slice(-10)
    .toUpperCase();

  return (
    <div className={styles.pass}>
      <article
        className={styles.card}
        aria-label={`TechXetra 2026 pass for ${name}`}
      >
        <Decoration />

        <div className={styles.main}>
          <header className={styles.head}>
            <Wordmark logoSrc={logoSrc || "/assets/wordmark.png"} />

            <div className={styles.titleBlock}>
              <span className={styles.pill}>PARTICIPANT PASS</span>
              <span className={styles.year}>2026</span>
            </div>
          </header>

          <div className={`${styles.cell} ${styles.cellBare}`}>
            <span className={styles.label}>PARTICIPANT NAME</span>
            <span className={styles.name}>{name}</span>
          </div>

          <div className={styles.row2}>
            <div className={styles.cell}>
              <span className={styles.label}>TECHXETRA ID</span>
              <span className={`${styles.value} ${styles.cyan}`}>
                {techxetraId}
              </span>
            </div>

            <div className={styles.cell}>
              <span className={styles.label}>PARTICIPANT CATEGORY</span>
              <span className={styles.value}>{category}</span>
            </div>
          </div>

          <div className={styles.cell}>
            <span className={styles.label}>REGISTERED EVENTS</span>

            {events.length ? (
              <ul className={`${styles.value} ${styles.events}`}>
                {events.map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
            ) : (
              <span className={styles.value}>—</span>
            )}
          </div>

          <div className={styles.row2}>
            <div className={styles.cell}>
              <span className={styles.label}>EVENT DATES</span>
              <span className={styles.value}>{dates}</span>
            </div>

            <div className={styles.cell}>
              <span className={styles.label}>VENUE</span>
              <span className={styles.value}>{venue}</span>
            </div>
          </div>
        </div>

        <aside className={styles.stub} aria-label="Entry QR code">
          <div className={styles.stubId}>
            <span className={styles.label}>TECHXETRA ID</span>
            <span className={`${styles.value} ${styles.cyan}`}>
              {techxetraId}
            </span>
          </div>

          <div className={styles.qr}>
            {qrValue ? (
              <QRCodeSVG
                value={qrValue}
                level="M"
                bgColor="#f3f6ff"
                fgColor="#0a0f33"
                title={`QR pass ${ticketNumber}`}
              />
            ) : (
              <div className={styles.qrEmpty}>
                QR not issued yet
              </div>
            )}
          </div>

          <span className={styles.brand}>
            TECHXETRA
            <br />
            2026
          </span>

          <div className={styles.strip} aria-hidden="true">
            <svg
              className={styles.bars}
              viewBox="0 0 18 200"
              preserveAspectRatio="none"
            >
              {bars.map((b) => (
                <rect
                  key={b.y}
                  x="0"
                  y={b.y}
                  width="18"
                  height={b.h}
                  fill="#0a0f33"
                />
              ))}
            </svg>

            <span className={styles.stripNo}>{shortNo}</span>
          </div>
        </aside>
      </article>
    </div>
  );
}

const ParticipantPass = memo(ParticipantPassBase);

export default ParticipantPass;