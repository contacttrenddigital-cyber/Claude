import json,sys
parts=json.load(open(sys.argv[1])); strokes=json.load(open(sys.argv[2])); out=sys.argv[3]
NAVY='#004689'
def f(x): return f'{x:.3f}s'
# ---- timeline ----
T_MAKE=0.05; MAKE_STAG=0.045; MAKE_DUR=0.5
T_EXC=0.45
GAP_STROKE=0.01; GAP_LETTER=0.0
def sdur(L): return 0.035+L/5500
t=T_EXC; prev=None
letter_end={}
for s in strokes:
    if prev is not None and s['letter']!=prev: t+=GAP_LETTER
    elif prev is not None: t+=GAP_STROKE
    s['del']=t; s['dur']=sdur(s['len']); t+=s['dur']; prev=s['letter']
    letter_end[s['letter']]=t
EXC_END=t
T_RENEW=EXC_END-0.15; RENEW_STAG=0.02; RENEW_DUR=0.4
renew_ids=list(range(14,26))
T_DOT=T_RENEW+RENEW_STAG*11+0.08
END=T_DOT+0.4
print('exc_end',round(EXC_END,2),'end',round(END,2))
# ---- svg ----
o=[]
o.append(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1322.19 578.97" width="1322" height="579" role="img" aria-labelledby="t">
<title id="t">Make One Exception – Renew Europe</title>
<!-- Animated logo. Total duration ≈ {END:.1f}s, plays once and holds the final frame. -->
<style>
.mk{{animation:mk {MAKE_DUR}s cubic-bezier(.16,1,.3,1) both}}
@keyframes mk{{from{{transform:translateY(150px)}}to{{transform:none}}}}
.ms{{fill:none;stroke:#fff;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 2;animation:draw linear both}}
@keyframes draw{{0%{{stroke-dashoffset:1;opacity:0}}.01%{{opacity:1}}100%{{stroke-dashoffset:0;opacity:1}}}}
.full{{animation:show .12s ease-out both}}
@keyframes show{{from{{opacity:0}}to{{opacity:1}}}}
.lt{{transform-box:fill-box;transform-origin:50% 60%;animation:pop .3s cubic-bezier(.3,1.6,.5,1) both}}
@keyframes pop{{0%{{transform:none}}35%{{transform:scale(1.09) rotate(-2.5deg)}}100%{{transform:none}}}}
.rn{{animation:rn {RENEW_DUR}s cubic-bezier(.2,.9,.3,1.2) both}}
@keyframes rn{{from{{opacity:0;transform:translateY(26px)}}to{{opacity:1;transform:none}}}}
.dot{{transform-box:fill-box;transform-origin:50% 50%;animation:dot .4s cubic-bezier(.3,1.8,.5,1) both}}
@keyframes dot{{from{{transform:scale(0)}}to{{transform:none}}}}
@media (prefers-reduced-motion:reduce){{*{{animation:none!important}}.ms{{stroke-dashoffset:0}}}}
</style>
<defs>
<clipPath id="cm"><rect x="0" y="30" width="1322.19" height="152"/></clipPath>''')
# masks per part
byp={}
for s in strokes: byp.setdefault(s['part'],[]).append(s)
for pi,ss in byp.items():
    o.append(f'<mask id="m{pi}" maskUnits="userSpaceOnUse" x="0" y="0" width="1322.19" height="578.97">')
    for s in ss:
        d='M'+' L'.join(f'{x},{y}' for x,y in s['pts'])
        o.append(f'<path class="ms" pathLength="1" stroke-width="{s["w"]}" style="animation-duration:{f(s["dur"])};animation-delay:{f(s["del"])}" d="{d}"/>')
    o.append('</mask>')
o.append('</defs>')
# MAKE ONE
o.append(f'<g clip-path="url(#cm)" fill="{NAVY}">')
for i,g in enumerate(parts['glyphs']):
    o.append(f'<path class="mk" style="animation-delay:{f(T_MAKE+i*MAKE_STAG)}" d="{g["d"]}"/>')
o.append('</g>')
# EXCEPTION letters
o.append('<g>')
for li in range(9):
    ps=[]
    for s in strokes:
        if s['letter']==li and s['part'] not in ps: ps.append(s['part'])
    end=letter_end[li]
    o.append(f'<g class="lt" style="animation-delay:{f(end-0.05)}">')
    for pi in ps:
        p=parts['paths'][pi]
        o.append(f'<path fill="{p["color"]}" mask="url(#m{pi})" d="{p["d"]}"/>')
        o.append(f'<path class="full" fill="{p["color"]}" style="animation-delay:{f(end)}" d="{p["d"]}"/>')
    o.append('</g>')
o.append('</g>')
# renew europe.
o.append(f'<g fill="{parts["paths"][14]["color"]}">')
for k,pi in enumerate(renew_ids):
    p=parts['paths'][pi]
    if pi==25:
        o.append(f'<path class="dot" style="animation-delay:{f(T_DOT)}" d="{p["d"]}"/>')
    else:
        o.append(f'<path class="rn" style="animation-delay:{f(T_RENEW+k*RENEW_STAG)}" d="{p["d"]}"/>')
o.append('</g>\n</svg>\n')
open(out,'w').write('\n'.join(o))
json.dump({'end':END},open(out+'.json','w'))
