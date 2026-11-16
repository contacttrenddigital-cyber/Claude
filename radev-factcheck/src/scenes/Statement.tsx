import React from 'react';
import {AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, FONT, FPS, SAFE, W} from '../theme';
import {SCENES} from '../timing';
import {SUBTITLE_GROUPS, SubWord} from '../subtitles';
import {ease, pop} from '../anim';

const Word: React.FC<{word: SubWord; t: number; frame: number}> = ({word, t, frame}) => {
  const spoken = t >= word.start;
  const startFrame = Math.round(word.start * FPS);
  const p = pop(frame, startFrame, 320, 20);
  const accentOn = word.accent && spoken;
  return (
    <span
      style={{
        display: 'inline-block',
        margin: '0 14px',
        color: accentOn ? C.white : spoken ? C.white : C.g77,
        background: accentOn ? C.red : 'transparent',
        padding: word.accent ? '0 22px' : 0,
        transform: `scale(${word.accent ? 0.9 + 0.25 * p : 0.96 + 0.04 * p})`,
        fontSize: 88,
      }}
    >
      {word.text.toUpperCase()}
    </span>
  );
};

export const Statement: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const zoom = interpolate(frame, [0, SCENES.statement], [1, 1.07]);

  const groupIndex = SUBTITLE_GROUPS.findIndex((g, i) => {
    const next = SUBTITLE_GROUPS[i + 1];
    const from = g[0].start - 0.08;
    const to = next ? next[0].start - 0.08 : Infinity;
    return t >= from && t < to;
  });
  const group = groupIndex >= 0 ? SUBTITLE_GROUPS[groupIndex] : null;
  const groupStart = group ? Math.round((group[0].start - 0.08) * FPS) : 0;

  return (
    <AbsoluteFill style={{background: C.black}}>
      <AbsoluteFill style={{transform: `scale(${zoom})`, transformOrigin: '50% 32%'}}>
        <OffthreadVideo
          src={staticFile('radev-original.mp4')}
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
      </AbsoluteFill>

      {/* затъмняване за четимост на надписите */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.82) 74%, rgba(0,0,0,0.9) 100%)',
        }}
      />

      {/* плочка с автора и датата */}
      <div
        style={{
          position: 'absolute',
          top: SAFE.top,
          left: SAFE.side,
          display: 'flex',
          alignItems: 'stretch',
          fontFamily: FONT,
          opacity: ease(frame, 4, 14),
          transform: `translateX(${(1 - ease(frame, 4, 16)) * -40}px)`,
        }}
      >
        <div style={{width: 12, background: C.red}} />
        <div style={{background: C.black, padding: '16px 26px'}}>
          <div style={{color: C.white, fontWeight: 900, fontSize: 40, letterSpacing: 1}}>
            РУМЕН РАДЕВ
          </div>
          <div style={{color: C.gD9, fontWeight: 700, fontSize: 26, letterSpacing: 2, marginTop: 4}}>
            ПРЕМИЕР · 16.11.2026 Г.
          </div>
        </div>
      </div>

      {/* субтитри */}
      {group ? (
        <div
          style={{
            position: 'absolute',
            left: SAFE.side - 30,
            width: W - (SAFE.side - 30) * 2,
            top: 1180,
            height: 320,
            display: 'flex',
            flexWrap: 'wrap',
            alignContent: 'center',
            justifyContent: 'center',
            fontFamily: FONT,
            fontWeight: 900,
            lineHeight: 1.22,
            letterSpacing: -1,
            textShadow: '0 4px 18px rgba(0,0,0,0.9)',
            opacity: ease(frame, groupStart, groupStart + 3),
          }}
        >
          {group.map((w) => (
            <Word key={w.text} word={w} t={t} frame={frame} />
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
