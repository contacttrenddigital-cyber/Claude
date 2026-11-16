import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {C, FONT, W} from './theme';
import {loadFonts} from './fonts';

loadFonts();

/** Корица: кадър от оригиналния запис (черно-бял) + основното послание. */
export const Poster: React.FC = () => {
  return (
    <AbsoluteFill style={{background: C.black, fontFamily: FONT}}>
      <Img
        src={staticFile('poster-frame.jpg')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: W,
          height: 1920,
          objectFit: 'cover',
          filter: 'grayscale(1) contrast(1.15) brightness(0.9)',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.05) 22%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.96) 62%, #000 100%)',
        }}
      />
      <div style={{position: 'absolute', top: 120, left: 80, display: 'flex', alignItems: 'center'}}>
        <div style={{background: C.red, color: C.white, fontWeight: 900, fontSize: 46, letterSpacing: 8, padding: '14px 28px'}}>
          ФАКТЧЕК
        </div>
      </div>

      <div style={{position: 'absolute', left: 80, width: W - 160, top: 1010}}>
        <div style={{fontWeight: 800, fontSize: 44, lineHeight: 1.2, color: C.white}}>
          „Ние сме <span style={{background: C.red, padding: '0 12px'}}>пети</span> в целия Европейски съюз…“
        </div>
        <div style={{fontWeight: 700, fontSize: 28, letterSpacing: 3, color: C.gD9, marginTop: 14}}>
          РУМЕН РАДЕВ · 16.11.2026 Г.
        </div>

        <div style={{display: 'flex', alignItems: 'center', marginTop: 30}}>
          <div style={{position: 'relative', fontWeight: 900, fontSize: 330, lineHeight: 0.95, color: C.white}}>
            5
            <svg width={260} height={320} style={{position: 'absolute', left: -30, top: 0}}>
              <line x1={10} y1={280} x2={250} y2={50} stroke={C.red} strokeWidth={30} />
            </svg>
          </div>
          <svg width={150} height={80} style={{margin: '0 30px'}}>
            <path d="M0 40 H120 M90 10 L125 40 L90 70" stroke={C.white} strokeWidth={14} fill="none" />
          </svg>
          <div style={{fontWeight: 900, fontSize: 330, lineHeight: 0.95, color: C.red}}>6</div>
          <div style={{fontWeight: 900, fontSize: 54, lineHeight: 1.05, color: C.white, marginLeft: 34}}>
            МЯСТО
            <br />
            ОТ 20
          </div>
        </div>

        <div style={{height: 8, background: C.white, marginTop: 30}} />
        <div style={{fontWeight: 900, fontSize: 110, letterSpacing: -2, whiteSpace: 'nowrap', color: C.red, marginTop: 14, lineHeight: 1.1}}>
          ПОДВЕЖДАЩО
        </div>
        <div style={{fontWeight: 700, fontSize: 32, letterSpacing: 2, color: C.white, marginTop: 6}}>
          КАКВО ПОКАЗВАТ ДАННИТЕ НА ЕВРОСТАТ
        </div>
      </div>
    </AbsoluteFill>
  );
};
