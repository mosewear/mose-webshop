#!/usr/bin/env python3
"""MOSE real-product photo motion. No invented garment or substitute fonts.

Usage: MOSE_BRAND_ASSETS=/font/folder python SCRIPT inputs.json OUTPUT_DIR
inputs.json holds films with slug, headline, segment_seconds and products.
Each product has image, label, sub and id. Images are exact Shopify sources.
Requires ffmpeg, ffprobe, Anton.ttf, Montserrat-Semibold.ttf and MOSE logos.
"""
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[2]
ASSETS=Path(os.environ.get('MOSE_BRAND_ASSETS',ROOT/'assets/brand'))
ANTON=ASSETS/'Anton.ttf'
MONTSERRAT=ASSETS/'Montserrat-Semibold.ttf'
LOGO=ROOT/'public/logomose.png'
for p in [ANTON,MONTSERRAT,LOGO]:
    if not p.is_file():raise FileNotFoundError(p)
FILMS=json.loads(Path(sys.argv[1]).read_text())
OUT=Path(sys.argv[2]).resolve();OUT.mkdir(parents=True,exist_ok=True)
FORMATS=[('1x1',1080,1080),('4x5',1080,1350),('5x4',1350,1080),
         ('9x16',1080,1920),('16x9',1920,1080),('1.91x1',1910,1000)]

def run(args):
    subprocess.run(['ffmpeg','-nostdin','-y','-loglevel','error','-filter_complex_threads','1',*args[:-1],'-threads','2',args[-1]],check=True)
    output=Path(args[-1])
    if output.stat().st_size<1024:raise RuntimeError(f'Empty render: {output}')
    subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(output)],check=True,stdout=subprocess.DEVNULL)

def draw(text,font,size,x,y):
    if any(c in text for c in "':,[]\\"):
        raise ValueError('Use plain prevalidated ad copy')
    return (f"drawtext=fontfile='{font}':text='{text}':fontsize={size}:"
            f"fontcolor=black:x={x}:y='{y}+12*pow(max(0,1-t/0.22),3)':"
            "alpha='min(1,t/0.10)'")

def layout(w,h):
    if h>w*1.6:
        return dict(side=860,px=110,py=410,lx=110,ly=260,lw=230,
                    tx=110,ty=1322,sy=1435,size=80,small=22,line=1292,lwidth=860)
    if w/h>1.5:
        return dict(side=880,px=w-900,py=(h-880)//2,lx=70,ly=95,lw=250,
                    tx=70,ty=570,sy=725,size=85,small=22,line=540,lwidth=700)
    side=780 if h==1080 else 860
    return dict(side=side,px=(w-side)//2,py=175 if h==1080 else 205,
                lx=64,ly=55,lw=190,tx=64,ty=920 if h==1080 else 1115,
                sy=1015 if h==1080 else 1240,size=68 if h==1080 else 82,
                small=21 if h==1080 else 23,line=890 if h==1080 else 1085,lwidth=w-128)

def encode(film,fmt):
    tag,w,h=fmt; cfg=layout(w,h)
    side=cfg['side'];frames=round(film['segment_seconds']*24)
    duration=frames/24
    args=[];graph=[];labels=[]
    for i,p in enumerate(film['products']):
        args+=['-i',p['image']]
        graph.append(f"[{i}:v]scale={side}:{side}:force_original_aspect_ratio=decrease,"
          f"pad={side}:{side}:(ow-iw)/2:(oh-ih)/2:white,"
          f"zoompan=z='1+0.018*on/{frames}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s={side}x{side}:fps=24,"
          f"pad={w}:{h}:{cfg['px']}:{cfg['py']}:white,trim=duration={duration},setpts=PTS-STARTPTS,"
          f"drawbox=x={cfg['tx']}:y={cfg['line']}:w={cfg['lwidth']}:h=8:color=0x00A676:t=fill,"
          +draw(p['label'],ANTON,cfg['size'],cfg['tx'],cfg['ty'])+','
          +draw(p['sub'],MONTSERRAT,cfg['small'],cfg['tx'],cfg['sy'])+','
          +draw(f"{i+1:02} / {len(film['products']):02}",MONTSERRAT,22,w-170,75 if h<1600 else 287)
          +f'[v{i}]')
        labels.append(f'[v{i}]')
    fs=95 if w>1500 else 80;cx='(w-tw)/2'
    graph.append(f'color=white:s={w}x{h}:r=24:d=1.8,'
      +draw('NO NONSENSE.',ANTON,fs,cx,int(h*.39))+','
      +draw('PURE CHARACTER.',ANTON,fs,cx,int(h*.39)+110)+','
      +f"drawbox=x={w//2-310}:y={int(h*.39)+240}:w=620:h=74:color=0x00A676:t=fill,"
      +draw('SHOP THE PANTS EDIT',MONTSERRAT,28,cx,int(h*.39)+263)+'[end]')
    labels.append('[end]')
    graph.append(''.join(labels)+f"concat=n={len(labels)}:v=1:a=0[film]")
    args+=['-i',str(LOGO)]
    graph.append(f"[{len(film['products'])}:v]scale={cfg['lw']}:-1[logo]")
    graph.append(f"[film][logo]overlay={cfg['lx']}:{cfg['ly']}:eof_action=repeat[out]")
    target=OUT/f"MOSE-{film['slug']}-Brand-V1-{tag}.mp4"
    run([*args,'-filter_complex',';'.join(graph),'-map','[out]','-an','-c:v','libx264',
       '-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(target)])
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(target)]))
    v=next(v for v in probe['streams'] if v['codec_type']=='video')
    assert (v['width'],v['height'])==(w,h)
    assert v['pix_fmt']=='yuv420p'
    expected=sum(round(film['segment_seconds']*24)/24 for _ in film['products'])+1.8
    assert abs(float(probe['format']['duration'])-expected)<0.15, (target,probe['format']['duration'],expected)
    subprocess.run(['ffmpeg','-nostdin','-v','error','-xerror','-i',str(target),'-f','null','-'],check=True)
    return dict(slug=film['slug'],format=tag,width=w,height=h,file=str(target),
                bytes=target.stat().st_size,duration=float(probe['format']['duration']))

tasks=[(f,fmt) for f in FILMS for fmt in FORMATS]
with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
    results=list(pool.map(lambda x:encode(*x),tasks))
(OUT/'collection-renders.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results))