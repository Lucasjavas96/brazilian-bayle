"""Compose remaining16 originals and collect the3 unchanged pilots into a19-photo set."""
from pathlib import Path
import json, shutil, math, html, zipfile
from PIL import Image, ImageDraw
import compor_pilotos as engine

HOME=Path(__file__).resolve().parent
LOTE=HOME/'lote'
for folder in ['artes','bases','fotos','camadas']:(LOTE/folder).mkdir(exist_ok=True)

# Registration reviewed against each blank garment, in native1086x1448 coordinates.
# centerX, topY, width, maximumHeight, top-edge tilt, bottom horizontal shift.
PLACEMENTS={
 '09':(530,335,260,410,12,0),
 '10':(548,397,282,360,-3,0),
 '11':(540,345,210,210,1,0),
 '12':(558,340,200,200,-9,-5),
 '13':(550,357,210,213,2,0),
 '14':(532,407,242,370,-7,0),
 '15':(535,333,264,400,7,0),
 '16':(545,397,248,380,-3,0),
 '17':(550,346,205,210,1,0),
 '18':(546,370,215,224,2,0),
 '19':(548,345,205,212,0,-4),
 '20':(550,360,210,210,-10,-12),
 '22':(546,371,220,220,2,0),
 '23':None,
 '25':(533,335,273,350,7,0),
 '26':(547,398,280,355,-2,0),
}

def quad_for(art,placement,cropped=False):
    cx,y,w,maxh,tilt,shift=placement
    im=Image.open(art);b=im.getbbox();aspect=(b[2]-b[0])/(b[3]-b[1])
    h=w/aspect
    if h>maxh:h=maxh;w=h*aspect
    lower=.94 if cropped else 1.04
    return [[round(cx-w/2),y],[round(cx+w/2),y+tilt],
            [round(cx+shift+w*lower/2),round(y+h+tilt)],
            [round(cx+shift-w*lower/2),round(y+h)]]

def main():
    base_rows=json.loads((LOTE/'prompts-bases.json').read_text())
    base_by_n={r['number']:r for r in base_rows}
    manifest=[]
    old_pilots=json.loads((HOME/'composicao-manifest.json').read_text())
    old_by_n={x['number']:x for x in old_pilots['pilots']}
    # Existing pilots are copied byte-for-byte, not recomposed or regenerated.
    for n in ['08','21','24']:
        old=old_by_n[n];art=HOME/old['artwork'];base=HOME/old['base'];photo=HOME/old['file']
        dest=LOTE/'fotos'/f'{n}-estudio-composicao.png'
        for src,target in [(art,LOTE/'artes'/art.name),(base,LOTE/'bases'/base.name),(photo,dest),
                           (HOME/'pilotos'/f'{n}-camada-estampa.png',LOTE/'camadas'/f'{n}-camada-estampa.png')]:
            shutil.copy2(src,target)
        assert engine.digest(photo)==engine.digest(dest)
        manifest.append({'number':n,'photo':str(dest.relative_to(LOTE)),
                         'artwork':'artes/'+art.name,'base':'bases/'+base.name,
                         'pilotUnchanged':True,'pilotSha256':engine.digest(photo),
                         'quad':old['quad'],'width':1086,'height':1448})
    engine.HERE=LOTE
    engine.OUT=LOTE/'fotos'
    for n,placement in PLACEMENTS.items():
        original=engine.source(n)
        if n=='23':
            art=LOTE/'artes'/'23-original-com-icone-oficial.png'
            shutil.copy2(HOME/'artes'/art.name,art)
            base=LOTE/'bases'/'23-sem-estampa.png'
            shutil.copy2(HOME/'bases'/'08-sem-estampa.png',base)
            quad=old_by_n['08']['quad']
            model='homem';fit='oversized';color='BLACK'
            pose='walking away and turning; approved08 base reused for white color variant'
            original_identical=False
        else:
            art=LOTE/'artes'/(original.stem+'-original.png')
            shutil.copy2(original,art)
            assert engine.digest(original)==engine.digest(art)
            row=base_by_n[n];model=row['model'];fit=row['fit'];color=row['color'];pose=row['pose']
            base=LOTE/'bases'/f'{n}-sem-estampa.png'
            if not base.exists():raise FileNotFoundError(f'Missing blank base: {base}')
            quad=quad_for(art,placement,fit=='cropped')
            original_identical=True
        composed=engine.compose(n,art,quad)
        generated=LOTE/composed['file'];dest=LOTE/'fotos'/f'{n}-estudio-composicao.png'
        generated.replace(dest)
        layer=LOTE/'fotos'/f'{n}-camada-estampa.png';layer.replace(LOTE/'camadas'/layer.name)
        record={'number':n,'photo':str(dest.relative_to(LOTE)),'artwork':str(art.relative_to(LOTE)),
                'base':str(base.relative_to(LOTE)),'model':model,'fit':fit,'shirtColor':color,'pose':pose,
                'sourceArtwork':str(original.relative_to(engine.ROOT)),
                'sourceSha256':engine.digest(original),'composedArtworkSha256':engine.digest(art),
                'originalArtworkByteIdentical':original_identical,'quad':quad,
                'width':composed['photoSize'][0],'height':composed['photoSize'][1],
                'generatedPrint':False}
        if n=='23':record['officialIconCheck']=old_pilots['checks']['23']
        manifest.append(record)
        print('composed',n,quad,flush=True)
    manifest.sort(key=lambda r:r['number'])
    assert len(manifest)==19 and {r['number'] for r in manifest}=={f'{i:02}' for i in range(8,27)}
    (LOTE/'manifesto-composicao.json').write_text(json.dumps({'photos':manifest,
        'method':'original source artwork composed on blank AI bases; perspective + photographed cloth texture',
        'nativePhotoResolution':'1086x1448; NOT native2K','sitePublished':False},ensure_ascii=False,indent=2),encoding='utf-8')
    portable=[]
    for row in base_rows:
        portable.append({k:v for k,v in row.items() if k!='path'})
    (LOTE/'prompts-bases.json').write_text(json.dumps(portable,ensure_ascii=False,indent=2),encoding='utf-8')
    # Whole-photo and close-up inspection boards; files themselves remain untouched.
    sheet=Image.new('RGB',(1800,2400),'#181818');d=ImageDraw.Draw(sheet)
    for i,row in enumerate(manifest):
        x=(i%5)*360;y=(i//5)*600;im=Image.open(LOTE/row['photo']);im.thumbnail((350,555))
        sheet.paste(im,(x+(360-im.width)//2,y+30));d.text((x+10,y+8),row['number'],fill='#c4a65f')
    sheet.save(LOTE/'prancha-19-composicao.jpg',quality=94)
    for part in range(4):
        group=manifest[part*5:(part+1)*5];detail=Image.new('RGB',(1800,700),'#ddd');dd=ImageDraw.Draw(detail)
        for i,row in enumerate(group):
            im=Image.open(LOTE/row['photo']).crop((310,290,780,850));im.thumbnail((350,630))
            detail.paste(im,(i*360,35));dd.text((i*360+8,8),row['number'],fill='black')
        detail.save(LOTE/f'detalhes-{part+1}.jpg',quality=96)
    cards=[]
    for row in manifest:
        n=row['number'];name=Path(row['artwork']).stem.replace('-original','').replace('-com-icone-oficial','').replace('-',' ')
        cards.append(f'<article><a href="{row["photo"]}"><img src="{row["photo"]}" alt="{html.escape(name)}" loading="lazy"></a><h2>{html.escape(name)}</h2><p><a href="{row["photo"]}" download>Baixar foto</a> · <a href="{row["artwork"]}">Arte fonte</a></p></article>')
    (LOTE/'galeria.html').write_text('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Brazilian Bayle ·19 fotos por composição</title><style>body{margin:0;padding:40px 4vw;background:#090909;color:#eee;font:16px system-ui}h1{font-size:clamp(28px,4vw,46px)}p{color:#aaa;line-height:1.5}a{color:#c4a65f}main{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:30px}img{display:block;width:100%}h2{font-size:15px}small{color:#c4a65f}@media(max-width:900px){main{grid-template-columns:repeat(2,1fr)}}@media(max-width:480px){main{gap:12px}h2{font-size:12px}}</style><header><small>BRAZILIAN BAYLE · COMPOSIÇÃO</small><h1>19 fotos. Estampas originais.</h1><p>Três pilotos preservados e16 fotos corrigidas por composição. IA apenas nas peças lisas. Fotos em resolução nativa1086×1448px; não são2K. Prévias para revisão, sem publicação na loja.</p><a href="prancha-19-composicao.jpg">Prancha completa</a> · <a href="README.md">Método e conferências</a></header><main>'+''.join(cards)+'</main></html>',encoding='utf-8')
    print('19-photo collection ready',flush=True)

if __name__=='__main__':main()
