import React from 'react';
import {Composition, Still} from 'remotion';
import {FPS, H, W} from './theme';
import {TOTAL_FRAMES} from './timing';
import {FactcheckVideo} from './Video';
import {Poster} from './Poster';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="FactcheckRadev"
        component={FactcheckVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={W}
        height={H}
      />
      <Still id="Poster" component={Poster} width={W} height={H} />
    </>
  );
};
