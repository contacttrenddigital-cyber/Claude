import re,sys,json
from svgpathtools import parse_path
src=sys.argv[1]; out=sys.argv[2]
s=open(src).read()
defs=s[:s.index('</defs>')]
body=s[s.index('</defs>'):]
glyphs={m.group(1):m.group(2) for m in re.finditer(r'<g id="(glyph-[\d-]+)">\s*(?:<path d="([^"]*)"/>)?',defs)}
# colored layer = after second <g fill=navy
navy=body.index('fill="rgb(0%, 27.450562%')
gblock=body[navy:body.index('</g>',navy)]
uses=re.findall(r'href="#(glyph-[\d-]+)" x="([\d.]+)" y="([\d.]+)"',gblock)
rest=body[body.index('</g>',navy):]
paths=re.findall(r'fill="rgb\(([^)]*)\)" fill-opacity="1" d="([^"]*)"',rest)
def hexc(rgb):
    v=[float(x.strip().rstrip('%'))*2.55 for x in rgb.split(',')]
    return '#%02X%02X%02X'%tuple(round(x) for x in v)
res={'glyphs':[],'paths':[]}
for g,x,y in uses:
    d=glyphs.get(g)
    if not d: continue
    p=parse_path(d).translated(complex(float(x),float(y)))
    res['glyphs'].append({'d':p.d(),'bbox':p.bbox()})
for rgb,d in paths:
    p=parse_path(d)
    subs=p.continuous_subpaths()
    big=[sp for sp in subs if (lambda b:(b[1]-b[0])*(b[3]-b[2]))(sp.bbox())>30]
    res['paths'].append({'color':hexc(rgb),'d':d.strip(),'bbox':p.bbox(),'nsub':len(subs),'nbig':len(big)})
json.dump(res,open(out,'w'))
for i,p in enumerate(res['paths']): print(i,p['color'],[round(v) for v in p['bbox']],p['nsub'],p['nbig'])
for g in res['glyphs']: print('G',[round(v) for v in g['bbox']])
