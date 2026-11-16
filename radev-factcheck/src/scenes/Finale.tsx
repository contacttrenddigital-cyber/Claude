import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {FACTS, SCALE_MAX} from '../data';
import {C, CONTENT_W, FONT, SAFE, W, bgNum} from '../theme';
import {ease, lin, pop, slam} from '../anim';

export const MESSAGE_AT = 66;
export const NOT_AT = 131;
export const VERDICT_AT = 222;

const Stat: React.FC<{label: string; value: number; start: number; frame: number; red?: boolean}> = ({
  label,
  value,
  start,
  frame,
  red,
}) => {
  const enter = pop(frame, start);
  const fill = ease(frame, start + 2, start + 22);
  const v = value * fill;
  return (
    <div style={{opacity: Math.min(1, enter * 1.5), transform: `translateY(${(1 - enter) * 40}px)`, marginBottom: 70}}>
      <div style={{fontWeight: 800, fontSize: 40, letterSpacing: 4, color: C.gD9}}>{label}:</div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 230,
          lineHeight: 1.02,
          letterSpacing: -8,
          color: C.white,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        +{bgNum(v)}%
      </div>
      <svg width={CONTENT_W} height={26} style={{display: 'block', marginTop: 12}}>
        <rect width={CONTENT_W} height={26} fill={C.g18} />
        <rect width={(v / SCALE_MAX) * CONTENT_W} height={26} fill={red ? C.red : C.gF2} />
      </svg>
    </div>
  );
};

export const Finale: React.FC = () => {
  const frame = useCurrentFrame();
  const partB = frame >= MESSAGE_AT;

  if (!partB) {
    const kicker = ease(frame, 2, 14);
    return (
      <AbsoluteFill style={{background: C.black, fontFamily: FONT}}>
        <div style={{position: 'absolute', left: SAFE.side, top: SAFE.top + 40, width: CONTENT_W}}>
          <div style={{display: 'flex', alignItems: 'center', opacity: kicker, marginBottom: 90}}>
            <div style={{width: 64 * kicker, height: 8, background: C.red, marginRight: 18}} />
            <span style={{fontWeight: 900, fontSize: 44, letterSpacing: 2, color: C.white}}>
              РЪСТЪТ Е РЕАЛЕН
            </span>
          </div>
          <Stat label="БЪЛГАРИЯ" value={FACTS.bulgariaGrowth} start={4} frame={frame} red />
          <Stat label="СРЕДНО ЗА ЕС" value={FACTS.euAverageGrowth} start={13} frame={frame} />
          <div style={{fontWeight: 700, fontSize: 28, letterSpacing: 1.5, color: C.gD9, opacity: ease(frame, 26, 36)}}>
            ГОДИШЕН РАСТЕЖ НА БВП · III ТРИМЕСЕЧИЕ НА 2026 Г.
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  const l1 = pop(frame, MESSAGE_AT);
  const not = slam(frame, NOT_AT);
  const l3 = pop(frame, NOT_AT + 15);
  const verdict = slam(frame, VERDICT_AT);
  const source = ease(frame, VERDICT_AT + 16, VERDICT_AT + 30);
  const lineStyle: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 104,
    letterSpacing: -2,
    lineHeight: 1,
    color: C.white,
    textAlign: 'center',
    whiteSpace: 'nowrap',
  };

  return (
    <AbsoluteFill style={{background: frame === MESSAGE_AT ? C.white : C.black, fontFamily: FONT}}>
      <div style={{position: 'absolute', left: 0, width: W, top: SAFE.top + 20}}>
        <div style={{...lineStyle, opacity: Math.min(1, l1 * 1.5), transform: `translateY(${(1 - l1) * 40}px)`}}>
          {FACTS.actualRank}-О МЯСТО ОТ {FACTS.withData}
        </div>
        <div
          style={{
            ...lineStyle,
            fontSize: 330,
            letterSpacing: -8,
            color: C.red,
            margin: '26px 0 30px',
            opacity: frame >= NOT_AT ? 1 : 0,
            transform: `scale(${interpolate(not, [0, 1], [1.9, 1])})`,
          }}
        >
          НЕ Е
        </div>
        <div style={{...lineStyle, opacity: Math.min(1, l3 * 1.5), transform: `translateY(${(1 - l3) * -40}px)`}}>
          {FACTS.claimedRank}-О МЯСТО
          <br />
          <span style={{fontSize: 96}}>В ЦЕЛИЯ ЕС ({FACTS.euMembers})</span>
        </div>
      </div>

      {/* редакционна оценка */}
      <div
        style={{
          position: 'absolute',
          left: SAFE.side,
          width: CONTENT_W,
          top: 1090,
          boxSizing: 'border-box',
          border: `8px solid ${C.white}`,
          padding: '22px 20px 28px',
          textAlign: 'center',
          opacity: frame >= VERDICT_AT ? 1 : 0,
          transform: `scale(${interpolate(verdict, [0, 1], [1.35, 1])})`,
        }}
      >
        <div style={{fontWeight: 900, fontSize: 54, letterSpacing: 10, color: C.white}}>ФАКТЧЕК:</div>
        <div style={{fontWeight: 900, fontSize: 98, letterSpacing: -1, lineHeight: 1.1, color: C.red}}>
          ПОДВЕЖДАЩО
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          width: W,
          top: 1462,
          textAlign: 'center',
          fontWeight: 500,
          fontSize: 27,
          color: C.gD9,
          opacity: source,
        }}
      >
        {FACTS.sources}
      </div>
    </AbsoluteFill>
  );
};
