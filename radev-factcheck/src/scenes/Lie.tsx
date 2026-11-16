import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {C, FONT, THEME} from '../theme';

// Във варианта „pp“ сцената е на светъл фон.
const LIGHT = THEME === 'pp';
const BG = LIGHT ? C.white : C.black;
const INK = LIGHT ? C.black : C.white;
const WORD_COLOR = LIGHT ? C.black : C.red;
const GHOST = LIGHT ? C.red : C.white;
const RULE = LIGHT ? C.red : C.white;
import {ease, slam} from '../anim';

const WORD = 'ЛЪЖА';
const SLICES = 6;
const GLITCH_FROM = 2;
const GLITCH_TO = 12;

const wordStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: FONT,
  fontWeight: 900,
  fontSize: 330,
  letterSpacing: -6,
  lineHeight: 1,
};

export const Lie: React.FC = () => {
  const frame = useCurrentFrame();
  const s = slam(frame, 1);
  const scale = interpolate(s, [0, 1], [2.6, 1]);
  const glitching = frame >= GLITCH_FROM && frame < GLITCH_TO;
  const strength = glitching ? 1 - (frame - GLITCH_FROM) / (GLITCH_TO - GLITCH_FROM) : 0;
  const line = ease(frame, 20, 32);
  const sub = ease(frame, 24, 34);

  return (
    <AbsoluteFill style={{background: frame < 1 ? INK : BG}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 560,
          height: 420,
          transform: `scale(${scale})`,
        }}
      >
        {/* бял „призрак“ — само в първите кадри */}
        {glitching ? (
          <div
            style={{
              ...wordStyle,
              color: GHOST,
              opacity: (LIGHT ? 0.9 : 0.55) * strength,
              transform: `translateX(${(random(`g${frame}`) - 0.5) * 60 * strength}px)`,
            }}
          >
            {WORD}
          </div>
        ) : null}
        {Array.from({length: SLICES}).map((_, i) => {
          const dx = glitching ? (random(`s${i}-${frame}`) - 0.5) * 90 * strength : 0;
          const top = (i / SLICES) * 100;
          const bottom = 100 - ((i + 1) / SLICES) * 100;
          return (
            <div
              key={i}
              style={{
                ...wordStyle,
                color: WORD_COLOR,
                clipPath: `inset(${top}% -20% ${bottom - 0.2}% -20%)`,
                transform: `translateX(${dx}px)`,
              }}
            >
              {WORD}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 100,
          top: 1010,
          width: 880 * line,
          height: LIGHT ? 16 : 8,
          background: RULE,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 1052,
          textAlign: 'center',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 58,
          letterSpacing: 1,
          color: INK,
          opacity: sub,
          transform: `translateY(${(1 - sub) * 24}px)`,
        }}
      >
        ЕВРОСТАТ ПОКАЗВА ДРУГО
      </div>
    </AbsoluteFill>
  );
};
