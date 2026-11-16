#!/usr/bin/env bash
# Собствени звукови ефекти, синтезирани изцяло с FFmpeg (без външни записи).
set -euo pipefail
cd "$(dirname "$0")/../public/sfx"
# удар
ffmpeg -v error -y -f lavfi -i "aevalsrc='0.9*sin(2*PI*(45*t+55*(1-exp(-t*9))/9*(-1)+100*t*exp(-t*9)))*exp(-t*5)':d=1.2:s=48000" \
  -f lavfi -i "anoisesrc=d=1.2:c=white:a=0.6:r=48000" \
  -filter_complex "[1]highpass=f=900,lowpass=f=6000,afade=t=out:st=0:d=0.09[n];[0]lowpass=f=220[b];[b][n]amix=inputs=2:normalize=0,alimiter=limit=0.9,afade=t=out:st=0.7:d=0.5" -ac 2 hit.wav
# цъкване при всеки ред
ffmpeg -v error -y -f lavfi -i "aevalsrc='0.5*sin(2*PI*1400*t)*exp(-t*70)+0.3*sin(2*PI*180*t)*exp(-t*40)':d=0.18:s=48000" -ac 2 tick.wav
# свистене при преход
ffmpeg -v error -y -f lavfi -i "anoisesrc=d=0.45:c=pink:a=0.9:r=48000" \
  -af "bandpass=f=1800:w=1600,afade=t=in:st=0:d=0.3:curve=exp,afade=t=out:st=0.32:d=0.13,volume=1.6" -ac 2 whoosh.wav
# зачеркване
ffmpeg -v error -y -f lavfi -i "anoisesrc=d=0.3:c=white:a=0.8:r=48000" \
  -af "highpass=f=2500,afade=t=in:st=0:d=0.03,afade=t=out:st=0.08:d=0.22" -ac 2 slash.wav
# тих фонов тон под графиките
ffmpeg -v error -y -f lavfi -i "aevalsrc='0.22*sin(2*PI*55*t)*(0.6+0.4*sin(2*PI*2*t))+0.08*sin(2*PI*110*t)*(0.5+0.5*sin(2*PI*0.25*t))':d=48:s=48000" \
  -af "lowpass=f=300,afade=t=in:st=0:d=1,afade=t=out:st=44:d=3.5" -ac 2 bed.wav
