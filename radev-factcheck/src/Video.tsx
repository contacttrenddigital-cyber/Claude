import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {C, FPS} from './theme';
import {SCENES, TOTAL_FRAMES, VOICEOVER_OFFSET, sceneStart} from './timing';
import {loadFonts} from './fonts';
import {Statement} from './scenes/Statement';
import {Lie} from './scenes/Lie';
import {CALLOUT_AT, ROW_STARTS, Ranking} from './scenes/Ranking';
import {FiveVsSix, NOTE_AT, STRIKE_AT, SWAP_AT} from './scenes/FiveVsSix';
import {Coverage, HEAD_AT, MISSING_AT, QUOTE_END} from './scenes/Coverage';
import {Finale, MESSAGE_AT, NOT_AT, VERDICT_AT} from './scenes/Finale';

loadFonts();

type Cue = {at: number; file: string; volume: number};

const lie = sceneStart('lie');
const ranking = sceneStart('ranking');
const five = sceneStart('fiveVsSix');
const coverage = sceneStart('coverage');
const finale = sceneStart('finale');

// Звукови акценти — всички са синтезирани с FFmpeg (scripts/make-sfx.sh).
const CUES: Cue[] = [
  {at: lie, file: 'hit.wav', volume: 1},
  {at: ranking, file: 'whoosh.wav', volume: 0.5},
  ...ROW_STARTS.slice(0, 5).map((f) => ({at: ranking + f, file: 'tick.wav', volume: 0.7})),
  {at: ranking + ROW_STARTS[5], file: 'hit.wav', volume: 0.75},
  {at: ranking + CALLOUT_AT, file: 'tick.wav', volume: 0.7},
  {at: five, file: 'whoosh.wav', volume: 0.5},
  {at: five + STRIKE_AT, file: 'slash.wav', volume: 0.9},
  {at: five + SWAP_AT, file: 'hit.wav', volume: 1},
  {at: coverage, file: 'whoosh.wav', volume: 0.45},
  {at: coverage + MISSING_AT, file: 'tick.wav', volume: 0.8},
  {at: coverage + QUOTE_END, file: 'tick.wav', volume: 0.7},
  {at: coverage + HEAD_AT, file: 'tick.wav', volume: 0.6},
  {at: five + NOTE_AT, file: 'tick.wav', volume: 0.6},
  {at: finale, file: 'whoosh.wav', volume: 0.45},
  {at: finale + MESSAGE_AT, file: 'tick.wav', volume: 0.8},
  {at: finale + NOT_AT, file: 'hit.wav', volume: 0.9},
  {at: finale + VERDICT_AT, file: 'hit.wav', volume: 1},
];

export const FactcheckVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{background: C.black}}>
      <Sequence durationInFrames={SCENES.statement}>
        <Statement />
      </Sequence>
      <Sequence from={lie} durationInFrames={SCENES.lie}>
        <Lie />
      </Sequence>
      <Sequence from={ranking} durationInFrames={SCENES.ranking}>
        <Ranking />
      </Sequence>
      <Sequence from={five} durationInFrames={SCENES.fiveVsSix}>
        <FiveVsSix />
      </Sequence>
      <Sequence from={coverage} durationInFrames={SCENES.coverage}>
        <Coverage />
      </Sequence>
      <Sequence from={finale} durationInFrames={SCENES.finale}>
        <Finale />
      </Sequence>

      {/* тих фонов тон под графиките — никога върху оригиналното изказване */}
      <Sequence from={ranking} durationInFrames={TOTAL_FRAMES - ranking}>
        <Audio src={staticFile('sfx/bed.wav')} volume={0.3} />
      </Sequence>
      {/* диктор — започва след оригиналното изказване и надписа „ЛЪЖА“ */}
      <Sequence from={ranking + VOICEOVER_OFFSET}>
        <Audio src={staticFile('voiceover.wav')} />
      </Sequence>
      {CUES.map((cue, i) => (
        <Sequence key={i} from={cue.at} durationInFrames={2 * FPS}>
          <Audio src={staticFile('sfx/' + cue.file)} volume={cue.at > ranking ? cue.volume * 0.5 : cue.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
