import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FACTS} from '../data';
import {C, CONTENT_W, FONT, SAFE} from '../theme';
import {SCENES} from '../timing';
import {ease, lin, pop} from '../anim';

const COLS = 9;
const ROWS = 3;
const GAP = 16;
const SQ = (CONTENT_W - GAP * (COLS - 1)) / COLS;
const GRID_H = ROWS * SQ + (ROWS - 1) * GAP;

export const GRID_FROM = 8; // появяване на 27-те квадратчета
export const FILL_FROM = 66; // запълване на 20-те с данни
export const MISSING_AT = 112; // открояване на 7-те без данни
const STEP = 2;

export const Coverage: React.FC = () => {
  const frame = useCurrentFrame();
  const out = 1 - lin(frame, SCENES.coverage - 6, SCENES.coverage);
  const total = Math.round(lin(frame, GRID_FROM, GRID_FROM + FACTS.euMembers * STEP) * FACTS.euMembers);
  const withData = Math.round(lin(frame, FILL_FROM, FILL_FROM + FACTS.withData * STEP) * FACTS.withData);
  const missing = ease(frame, MISSING_AT, MISSING_AT + 10);
  const legend = ease(frame, MISSING_AT + 6, MISSING_AT + 18);
  const head = pop(frame, 134);
  const sub = ease(frame, 152, 166);
  const warn = ease(frame, 172, 186);

  return (
    <AbsoluteFill style={{background: C.black, fontFamily: FONT, opacity: out}}>
      <div style={{position: 'absolute', left: SAFE.side, top: SAFE.top, width: CONTENT_W}}>
        {/* броячи */}
        <div style={{display: 'flex', alignItems: 'baseline', fontVariantNumeric: 'tabular-nums'}}>
          <span style={{fontWeight: 900, fontSize: 250, lineHeight: 0.9, letterSpacing: -8, color: C.white}}>
            {withData}
          </span>
          <span style={{fontWeight: 900, fontSize: 90, color: C.g77, margin: '0 26px'}}>ОТ</span>
          <span style={{fontWeight: 900, fontSize: 250, lineHeight: 0.9, letterSpacing: -8, color: C.g77}}>
            {total}
          </span>
        </div>
        <div style={{marginTop: 14, fontWeight: 800, fontSize: 30, letterSpacing: 4, color: C.gD9}}>
          ДЪРЖАВИ В ЕВРОПЕЙСКИЯ СЪЮЗ
        </div>

        {/* решетка: 27 еднакви квадратчета */}
        <svg width={CONTENT_W} height={GRID_H} style={{display: 'block', marginTop: 44}}>
          {Array.from({length: FACTS.euMembers}).map((_, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const x = col * (SQ + GAP);
            const y = row * (SQ + GAP);
            const appear = pop(frame, GRID_FROM + i * STEP, 260, 20);
            const hasData = i < FACTS.withData;
            const filled = hasData ? ease(frame, FILL_FROM + i * STEP, FILL_FROM + i * STEP + 6) : 0;
            const s = 0.6 + 0.4 * appear;
            return (
              <g key={i} opacity={Math.min(1, appear * 1.5)} transform={`translate(${x + SQ / 2} ${y + SQ / 2}) scale(${s})`}>
                <rect x={-SQ / 2} y={-SQ / 2} width={SQ} height={SQ} fill={C.g18} />
                {hasData ? (
                  <rect x={-SQ / 2} y={-SQ / 2} width={SQ} height={SQ} fill={C.white} opacity={filled} />
                ) : (
                  <rect
                    x={-SQ / 2 + 3}
                    y={-SQ / 2 + 3}
                    width={SQ - 6}
                    height={SQ - 6}
                    fill="none"
                    stroke={C.red}
                    strokeWidth={6}
                    opacity={missing}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* легенда */}
        <div style={{marginTop: 30, opacity: legend, fontWeight: 800, fontSize: 28, letterSpacing: 1, color: C.white}}>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <div style={{width: 34, height: 34, background: C.white, marginRight: 18}} />
            ИМА ПУБЛИКУВАНИ ДАННИ — {FACTS.withData}
          </div>
          <div style={{display: 'flex', alignItems: 'center', marginTop: 16}}>
            <div
              style={{
                width: 34,
                height: 34,
                boxSizing: 'border-box',
                background: C.g18,
                border: `5px solid ${C.red}`,
                marginRight: 18,
              }}
            />
            НЯМА ДАННИ — {FACTS.euMembers - FACTS.withData}
            <span style={{color: C.g77, marginLeft: 14}}>(НЕ ОЗНАЧАВА 0% РЪСТ)</span>
          </div>
        </div>

        {/* заглавие */}
        <div
          style={{
            marginTop: 62,
            fontWeight: 900,
            fontSize: 72,
            lineHeight: 1.04,
            letterSpacing: -1.5,
            color: C.white,
            opacity: Math.min(1, head * 1.5),
            transform: `translateY(${(1 - head) * 36}px)`,
          }}
        >
          <span style={{whiteSpace: 'nowrap'}}>ИМА ДАННИ САМО ЗА</span>
          <br />
          {FACTS.withData} ОТ {FACTS.euMembers} ДЪРЖАВИ
        </div>
        <div style={{marginTop: 26, fontWeight: 700, fontSize: 31, letterSpacing: 0, whiteSpace: 'nowrap', color: C.gD9, opacity: sub}}>
          ЗА ОЩЕ {FACTS.euMembers - FACTS.withData} ДЪРЖАВИ НЯМА ПУБЛИКУВАНИ ДАННИ
        </div>
        <div style={{marginTop: 34, display: 'flex', alignItems: 'center', opacity: warn}}>
          <div style={{width: 12, height: 50, background: C.red, marginRight: 20}} />
          <span style={{fontWeight: 900, fontSize: 38, color: C.white}}>
            КЛАСИРАНЕТО МОЖЕ ДА СЕ ПРОМЕНИ
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
