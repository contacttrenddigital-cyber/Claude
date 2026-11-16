import React from 'react';
import {Img, staticFile} from 'remotion';
import {C} from './theme';

/** Знаме (4:3) от public/flags; code = 'bg', 'eu' и т.н. */
export const Flag: React.FC<{code: string; height: number; style?: React.CSSProperties}> = ({code, height, style}) => (
  <Img
    src={staticFile(`flags/${code}.svg`)}
    style={{
      height,
      width: (height * 4) / 3,
      display: 'inline-block',
      flexShrink: 0,
      outline: `2px solid ${C.g33}`,
      ...style,
    }}
  />
);
