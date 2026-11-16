import json,sys,numpy as np, heapq
from PIL import Image,ImageDraw,ImageFilter,ImageChops
from svgpathtools import parse_path
from skimage.morphology import medial_axis
parts=json.load(open(sys.argv[1])); outdir=sys.argv[2]
SC=4.0
# stroke plan: letter index, part index, waypoints (pt)
PLAN=[
 (0,6,[(43,233),(62,386)]),            # E vertical (part5)  -- fixed below
]
PLAN=[
 # letter, part, waypoints
 (0,5,[(43,233),(62,386)]),
 (0,6,[(67,224),(142,253)]),
 (0,5,[(51,296),(159,316)]),
 (0,7,[(49,415),(178,379)]),
 (1,2,[(189,258),(305,344)]),
 (1,2,[(311,224),(232,421)]),
 (2,3,[(400,272),(440,397)]),
 (3,8,[(471,233),(490,386)]),
 (3,9,[(475,229),(551,259)]),
 (3,8,[(479,296),(587,316)]),
 (3,10,[(475,390),(608,403)]),
 (4,4,[(639,224),(650,416)]),
 (4,4,[(641,224),(690,275),(655,300)]),
 (5,13,[(724,262),(869,252)]),
 (5,12,[(819,251),(826,412)]),
 (6,11,[(931,255),(937,406)]),
 (7,1,[(1039,289),(1061,291),(1021,238),(957,324),(1025,405),(1097,387),(1058,324),(1048,334)]),
 (8,0,[(1117,403),(1137,252),(1262,405),(1253,264)]),
 (8,0,[(1264,409),(1274,428)]),
]
cache={}
def raster(pi):
    if pi in cache: return cache[pi]
    path=parse_path(parts['paths'][pi]['d'])
    b=path.bbox(); x0,y0=b[0]-6,b[2]-6
    W,H=int((b[1]-b[0]+12)*SC),int((b[3]-b[2]+12)*SC)
    acc=Image.new('1',(W,H),0)
    for sp in path.continuous_subpaths():
        bb=sp.bbox()
        if (bb[1]-bb[0])*(bb[3]-bb[2])<60: continue   # ignore speckles
        n=max(80,int(sp.length()*SC))
        pts=[((z.real-x0)*SC,(z.imag-y0)*SC) for z in (sp.point(t) for t in np.linspace(0,1,n))]
        im=Image.new('1',(W,H),0); ImageDraw.Draw(im).polygon(pts,fill=1)
        acc=ImageChops.logical_xor(acc,im)
    g=acc.convert('L').filter(ImageFilter.GaussianBlur(3))
    m=np.array(g)>128
    sk,dist=medial_axis(m,return_distance=True)
    cache[pi]=(m,sk,dist,x0,y0); return cache[pi]
def shortest(sk,a,b):
    H,W=sk.shape
    D={a:0};pq=[(0,a)];prev={a:None}
    while pq:
        d,u=heapq.heappop(pq)
        if u==b: break
        if d>D[u]: continue
        y,x=u
        for dy in(-1,0,1):
            for dx in(-1,0,1):
                if not(dy or dx): continue
                v=(y+dy,x+dx)
                if 0<=v[0]<H and 0<=v[1]<W and sk[v]:
                    nd=d+(1.414 if dy and dx else 1)
                    if nd<D.get(v,1e18): D[v]=nd;prev[v]=u;heapq.heappush(pq,(nd,v))
    if b not in prev: raise SystemExit('no path')
    out=[];u=b
    while u is not None: out.append(u);u=prev[u]
    return out[::-1]
def smooth(pts,k=4):
    P=np.array(pts,float); Q=P.copy()
    for i in range(len(P)):
        a,b=max(0,i-k),min(len(P),i+k+1); Q[i]=P[a:b].mean(0)
    Q[0],Q[-1]=P[0],P[-1]; return Q
def simplify(P,eps=0.35):
    # RDP
    if len(P)<3: return P
    a,b=P[0],P[-1]; ab=b-a; n=np.hypot(*ab)
    R=P-a
    d=np.abs(ab[0]*R[:,1]-ab[1]*R[:,0])/n if n>1e-6 else np.hypot(R[:,0],R[:,1])
    i=int(np.argmax(d))
    if d[i]>eps: return np.vstack([simplify(P[:i+1],eps)[:-1],simplify(P[i:],eps)])
    return np.vstack([a,b])
out=[]
canvas=Image.new('RGB',(1983,450),'white'); cd=ImageDraw.Draw(canvas)
for pi in range(14):
    m,sk,dist,x0,y0=raster(pi)
    ys,xs=np.nonzero(m)
    for y,x in zip(ys[::7],xs[::7]): cd.point(((x/SC+x0)*1.5,(y/SC+y0)*1.5-300),fill=(220,220,220))
for li,pi,wps in PLAN:
    m,sk,dist,x0,y0=raster(pi)
    sy,sx=np.nonzero(sk)
    def snap(p):
        X=(p[0]-x0)*SC;Y=(p[1]-y0)*SC
        i=np.argmin((sx-X)**2+(sy-Y)**2); return (int(sy[i]),int(sx[i]))
    nodes=[snap(p) for p in wps]
    pix=[]
    for a,b in zip(nodes,nodes[1:]):
        seg=shortest(sk,a,b); pix+= seg if not pix else seg[1:]
    rmax=max(dist[p] for p in pix)/SC
    P=smooth([(x/SC+x0,y/SC+y0) for y,x in pix],k=int(SC*2))
    P=simplify(P)
    L=float(np.sum(np.hypot(*np.diff(P,axis=0).T)))
    out.append({'letter':li,'part':pi,'pts':[[round(float(x),2),round(float(y),2)] for x,y in P],'len':round(L,1),'w':round(2*rmax+4,1)})
    q=[(x*1.5,y*1.5-300) for x,y in P]
    cd.line(q,fill=parts['paths'][pi]['color'],width=3)
    cd.ellipse([q[0][0]-4,q[0][1]-4,q[0][0]+4,q[0][1]+4],fill='black')
    print(len(out)-1,li,pi,'n',len(P),'len',round(L),'w',round(2*rmax+4,1))
canvas.save(outdir+'/strokes.png')
json.dump(out,open(outdir+'/strokes.json','w'))
