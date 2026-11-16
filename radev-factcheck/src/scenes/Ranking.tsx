import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {CountryGrowth, RANKING, SCALE_MAX} from '../data';
import {C, CONTENT_W, FONT, SAFE, bgNum} from '../theme';
import {SCENES} from '../timing';
import {ease, lin, pop} from '../anim';

/** Кадър, в който се появява всеки ред (следва темпото на текста). */
export const ROW_STARTS = [56, 98, 150, 204, 258, 322] as const;
export const CALLOUT_AT = 366;

const RANK_W = 96;
const BAR_W = CONTENT_W - RANK_W;
const BAR_H = 28;
const ROW_H = 132;
const FILL_FRAMES = 30;

const Row: React.FC<{item: CountryGrowth; start: number; frame: number}> = ({item, start, frame}) => {
  const enter = pop(frame, start);
  const fill = ease(frame, start + 4, start + 4 + FILL_FRAMES);
  const value = item.growth * fill;
  const hl = item.highlight;
  const isFifth = item.rank === 5;
  const bulgariaIn = lin(frame, ROW_STARTS[5], ROW_STARTS[5] + 8);
  const boxed = hl ? 1 : isFifth ? bulgariaIn : 0;

  return (
    <div
      style={{
        height: ROW_H,
        display: 'flex',
        alignItems: 'center',
        opacity: Math.min(1, enter * 1.4),
        transform: `translateX(${(1 - enter) * -60}px)`,
        fontFamily: FONT,
      }}
    >
      <div style={{width: RANK_W}}>
        <div
          style={{
            width: 68,
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: 54,
            color: hl ? C.white : isFifth && boxed > 0.5 ? C.black : C.g77,
            background: hl ? C.red : isFifth ? `rgba(255,255,255,${boxed})` : 'transparent',
          }}
        >
          {item.rank}
        </div>
      </div>
      <div style={{width: BAR_W}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
          <span
            style={{
              fontWeight: 900,
              fontSize: 46,
              letterSpacing: 0.5,
              color: C.white,
            }}
          >
            {item.name.toUpperCase()}
          </span>
          <span
            style={{
              fontWeight: 900,
              fontSize: 56,
              color: hl ? C.red : C.white,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {bgNum(value)}%
          </span>
        </div>
        <svg width={BAR_W} height={BAR_H} style={{display: 'block', marginTop: 8}}>
          <rect x={0} y={0} width={BAR_W} height={BAR_H} fill={C.g18} />
          <rect
            x={0}
            y={0}
            width={(value / SCALE_MAX) * BAR_W}
            height={BAR_H}
            fill={hl ? C.red : C.gF2}
          />
          {[1, 2, 3].map((tick) => (
            <rect key={tick} x={(tick / SCALE_MAX) * BAR_W - 1} y={0} width={2} height={BAR_H} fill={C.black} />
          ))}
        </svg>
      </div>
    </div>
  );
};

export const Ranking: React.FC = () => {
  const frame = useCurrentFrame();
  const out = 1 - lin(frame, SCENES.ranking - 6, SCENES.ranking);
  const kicker = ease(frame, 2, 14);
  const title = ease(frame, 8, 22);
  const subtitle = ease(frame, 20, 34);
  const axis = ease(frame, 40, 54);
  const callout = pop(frame, CALLOUT_AT);

  return (
    <AbsoluteFill style={{background: C.black, fontFamily: FONT, opacity: out}}>
      <div style={{position: 'absolute', left: SAFE.side, top: SAFE.top, width: CONTENT_W}}>
        <div style={{display: 'flex', alignItems: 'center', opacity: kicker}}>
          <div style={{width: 64 * kicker, height: 8, background: C.red, marginRight: 18}} />
          <span style={{fontWeight: 800, fontSize: 30, letterSpacing: 5, color: C.white}}>
            ДАННИ НА ЕВРОСТАТ
          </span>
        </div>
        <div
          style={{
            marginTop: 18,
            fontWeight: 900,
            fontSize: 98,
            lineHeight: 1.0,
            letterSpacing: -2,
            color: C.white,
            opacity: title,
            transform: `translateY(${(1 - title) * 30}px)`,
          }}
        >
          ИКОНОМИЧЕСКИ
          <br />
          РЪСТ В ЕС
        </div>
        <div
          style={{
            marginTop: 22,
            fontWeight: 700,
            fontSize: 31,
            letterSpacing: 1.5,
            color: C.gD9,
            opacity: subtitle,
          }}
        >
          III ТРИМЕСЕЧИЕ НА 2026 Г. · НА ГОДИШНА БАЗА
        </div>

        <div style={{marginTop: 34}}>
          {RANKING.map((item, i) => (
            <Row key={item.name} item={item} start={ROW_STARTS[i]} frame={frame} />
          ))}
        </div>

        {/* обща скала от нулата */}
        <div style={{marginLeft: RANK_W, width: BAR_W, position: 'relative', height: 34, opacity: axis}}>
          {[0, 1, 2, 3, 4].map((tick) => (
            <span
              key={tick}
              style={{
                position: 'absolute',
                left: (tick / SCALE_MAX) * BAR_W,
                transform: `translateX(${tick === 0 ? 0 : tick === 4 ? -100 : -50}%)`,
                fontWeight: 700,
                fontSize: 24,
                color: C.g77,
              }}
            >
              {tick}%
            </span>
          ))}
        </div>

        <div
          style={{
            marginTop: 26,
            display: 'flex',
            alignItems: 'center',
            opacity: Math.min(1, callout * 1.5),
            transform: `translateY(${(1 - callout) * 30}px)`,
          }}
        >
          <div style={{width: 12, alignSelf: 'stretch', background: C.red, marginRight: 22}} />
          <div style={{fontWeight: 900, fontSize: 46, lineHeight: 1.12, color: C.white}}>
            ПРЕД БЪЛГАРИЯ СА <span style={{color: C.red}}>5 ДЪРЖАВИ</span>,
            <br />А НЕ 4
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
