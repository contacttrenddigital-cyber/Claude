import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {FACTS} from '../data';
import {C, FONT, W} from '../theme';
import {SCENES} from '../timing';
import {ease, lin, pop, slam} from '../anim';

export const STRIKE_AT = 34;
export const SWAP_AT = 62;

const DIGIT_TOP = 420;
const DIGIT_H = 860;

const digitStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  width: W,
  top: DIGIT_TOP,
  height: DIGIT_H,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: FONT,
  fontWeight: 900,
  fontSize: 900,
  lineHeight: 1,
};

export const FiveVsSix: React.FC = () => {
  const frame = useCurrentFrame();
  const swapped = frame >= SWAP_AT;
  const fiveIn = pop(frame, 0, 180, 16);
  const strike = ease(frame, STRIKE_AT, STRIKE_AT + 9);
  const sixIn = slam(frame, SWAP_AT);
  const fiveOut = lin(frame, SWAP_AT, SWAP_AT + 3);
  const shake = swapped ? Math.max(0, 1 - (frame - SWAP_AT) / 8) : 0;
  const dx = (random(`x${frame}`) - 0.5) * 22 * shake;
  const dy = (random(`y${frame}`) - 0.5) * 22 * shake;
  const flash = frame === SWAP_AT;
  const claim = ease(frame, 6, 18);
  const truth = pop(frame, SWAP_AT + 6);
  const note = ease(frame, SWAP_AT + 26, SWAP_AT + 40);
  const out = 1 - lin(frame, SCENES.fiveVsSix - 5, SCENES.fiveVsSix);

  // диагонална линия на зачеркване
  const x1 = 170;
  const y1 = DIGIT_TOP + 700;
  const x2 = 910;
  const y2 = DIGIT_TOP + 160;

  return (
    <AbsoluteFill style={{background: flash ? C.white : C.black, fontFamily: FONT, opacity: out}}>
      <AbsoluteFill style={{transform: `translate(${dx}px, ${dy}px)`}}>
        {/* твърдението */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: W,
            top: 262,
            textAlign: 'center',
            fontWeight: 900,
            fontSize: 70,
            letterSpacing: 0.5,
            color: swapped ? C.g77 : C.white,
            opacity: claim,
            transform: `translateY(${(1 - claim) * -24}px)`,
          }}
        >
          <span style={{position: 'relative', display: 'inline-block'}}>
            РАДЕВ: {FACTS.claimedRank}-О МЯСТО
            <span
              style={{
                position: 'absolute',
                left: -10,
                top: '50%',
                height: 8,
                marginTop: -4,
                width: `calc(${ease(frame, SWAP_AT + 2, SWAP_AT + 12) * 100}% + 20px)`,
                background: C.red,
                opacity: swapped ? 1 : 0,
              }}
            />
          </span>
        </div>

        {/* 5 */}
        {fiveOut < 1 ? (
          <div
            style={{
              ...digitStyle,
              color: C.white,
              opacity: 1 - fiveOut,
              transform: `scale(${interpolate(fiveIn, [0, 1], [0.7, 1]) * (1 - 0.25 * fiveOut)})`,
            }}
          >
            {FACTS.claimedRank}
          </div>
        ) : null}

        {/* червената линия */}
        {!swapped && strike > 0 ? (
          <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
            <line
              x1={x1}
              y1={y1}
              x2={x1 + (x2 - x1) * strike}
              y2={y1 + (y2 - y1) * strike}
              stroke={C.red}
              strokeWidth={54}
              strokeLinecap="butt"
            />
          </svg>
        ) : null}

        {/* 6 */}
        {swapped ? (
          <div
            style={{
              ...digitStyle,
              color: C.red,
              transform: `scale(${interpolate(sixIn, [0, 1], [1.7, 1])})`,
            }}
          >
            {FACTS.actualRank}
          </div>
        ) : null}

        {/* фактът */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: W,
            top: 1290,
            textAlign: 'center',
            fontWeight: 900,
            fontSize: 70,
            letterSpacing: 0.5,
            color: C.white,
            opacity: Math.min(1, truth * 1.5),
            transform: `scale(${interpolate(truth, [0, 1], [1.25, 1])})`,
          }}
        >
          ЕВРОСТАТ: <span style={{color: C.red}}>{FACTS.actualRank}-О МЯСТО</span>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: W,
            top: 1400,
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: 2,
            lineHeight: 1.4,
            color: C.gD9,
            opacity: note,
          }}
        >
          БЪЛГАРИЯ Е ШЕСТА, А НЕ ПЕТА
          <br />
          СРЕД ДЪРЖАВИТЕ С ПУБЛИКУВАНИ ДАННИ
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
