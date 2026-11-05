#!/usr/bin/env python3
"""Render product-faithful MOSE motion with format-specific kinetic typography.

Requires ffmpeg, original MOSE logos, Anton.ttf and Montserrat-Semibold.ttf.
Set MOSE_BRAND_ASSETS to the font folder. No substitute fonts.
Fonts: google/fonts, ofl/anton and ofl/montserrat, SIL Open Font License.
Usage: python render-denim-ad-formats.py SOURCE.mp4 OUTPUT_DIR
The source is a visually approved 1920x1080, 10-second denim film.
"""
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import sys

SOURCE = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2]).resolve()
OUT.mkdir(parents=True, exist_ok=True)
ROOT = Path(__file__).resolve().parents[2]
ASSETS = Path(os.environ.get('MOSE_BRAND_ASSETS', str(ROOT / 'assets' / 'brand')))
FONT = str(ASSETS / 'Montserrat-Semibold.ttf')
BOLD = str(ASSETS / 'Anton.ttf')
for required in [Path(FONT), Path(BOLD), ROOT/'public/logomose.png', ROOT/'public/logomose_white.png']:
    if not required.is_file():
        raise FileNotFoundError(f'Required MOSE brand asset missing: {required}')
FORMATS = [('1x1',1080,1080), ('4x5',1080,1350), ('5x4',1350,1080),
           ('9x16',1080,1920), ('16x9',1920,1080), ('1.91x1',1910,1000)]

def text(value, size, x, y, start, end, color='white', bold=True):
    # Short eased slide plus opacity animation, designed to work without sound.
    alpha = f'max(0,min(1,min((t-{start})/0.18,({end}-t)/0.18)))'
    yy = f'({y})+16*pow(max(0,1-(t-{start})/0.28),3)'
    return (f"drawtext=fontfile='{BOLD if bold else FONT}':text='{value}':"
            f"fontsize={size}:fontcolor={color}:x='{x}':y='{yy}':"
            f"alpha='{alpha}':enable='between(t,{start},{end})'")

def render(spec):
    name,w,h=spec
    portrait=name=='9x16'
    if portrait:
        base="crop=864:1080:'if(lt(t,1.20833),80,528)':0,scale=800:1000,setsar=1,pad=1080:1920:140:380:color=white"
        filters=[base, 'drawbox=x=140:y=1392:w=800:h=10:color=0x00A676:t=fill']
        tx='140'; y=1415; detail=1510; fs=82; small=21; color='black'
        logo=str(ROOT / 'public/logomose.png'); lx=140; ly=260; lw=220
    else:
        ratio=w/h; cw=min(1920,round(1080*ratio/2)*2); ch=min(1080,round(1920/ratio/2)*2)
        first_x=max(0,min(512-cw//2,1920-cw)); center_x=(1920-cw)//2
        base=f"crop={cw}:{ch}:'if(lt(t,1.20833),{first_x},{center_x})':{(1080-ch)//2},scale={w}:{h},setsar=1"
        filters=[base, f'drawbox=x=0:y={h-230}:w=iw:h=230:color=black@0.86:t=fill',
                 f'drawbox=x=54:y={h-230}:w={w-108}:h=8:color=0x00A676:t=fill']
        tx='54'; y=h-202; detail=h-77; fs=96 if w<1500 else 112; small=23 if w<1500 else 27; color='white'
        logo=str(ROOT / 'public/logomose_white.png'); lx=54; ly=54; lw=190
    lines=[('WASHED DENIM.','A SHORT, RELAXED FIT',0.05,5.58),
           ('THE DETAILS MATTER.','FULL ZIP. WASHED BLACK.',5.78,8.65),
           ('DENIM ZIP JACKET','SHOP THE FIT AT MOSEWEAR.COM',8.73,10.1)]
    for title,sub,start,end in lines:
        # Long headline is slightly smaller for mobile widths.
        title_size=fs if len(title)<18 else round(fs*.81)
        filters += [text(title,title_size,tx,y,start,end,color),
                    text(sub,small,tx,detail,start+.08,end,color,False)]
    target=OUT/f'MOSE-Denim-Brand-V2-{name}.mp4'
    graph='[0:v]'+','.join(filters)+'[film];[1:v]scale='+str(lw)+':-1[logo];[film][logo]overlay='+str(lx)+':'+str(ly)+':eof_action=repeat[out]'
    subprocess.run(['ffmpeg','-y','-i',str(SOURCE),'-i',logo,'-an','-filter_complex',graph,'-map','[out]',
                    '-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',
                    '-movflags','+faststart','-metadata','title=MOSE Denim Edit',
                    str(target),'-loglevel','error'],check=True)
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(target)]))
    v=next(s for s in probe['streams'] if s['codec_type']=='video')
    assert (v['width'],v['height'])==(w,h)
    assert v['pix_fmt']=='yuv420p'
    assert 9.9<float(probe['format']['duration'])<10.3
    return {'file':str(target),'width':w,'height':h,'duration':probe['format']['duration'],'bytes':target.stat().st_size}

if len(sys.argv)>3:
    FORMATS=[f for f in FORMATS if f[0] in sys.argv[3:]]

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results=list(pool.map(render,FORMATS))
(OUT/'render-manifest.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results))