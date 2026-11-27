"""Composition approved by user: original pixels + official icon, no AI lettering."""
from pathlib import Path
import hashlib, json, shutil
import cv2
import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ART = HERE / 'artes'
OUT = HERE / 'pilotos'
ART.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)

def source(number):
    return next((ROOT / 'produtos').glob(f'**/{number}-*.png'))

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def replace_icon(number, color):
    original = Image.open(source(number)).convert('RGBA')
    a = np.array(original)
    # Segmentation from original 08 alpha; same canvas/layout in the color variants.
    ref = np.array(Image.open(source('08')).convert('RGBA'))
    _, labels, stats, _ = cv2.connectedComponentsWithStats((ref[3800:, :, 3] > 8).astype('uint8'), 8)
    # Preserve text components crossing the boundary and the two sound-wave groups.
    protected = np.isin(labels, [1, 2, 3, 4, 5, 6, 8, 9]).astype('uint8')
    protected = cv2.dilate(protected, np.ones((5, 5), np.uint8)) > 0
    rgb = ref[3800:, :, :3].astype(float)
    yellow = ((rgb[:,:,0] > 140) & (rgb[:,:,1] > 100) & (rgb[:,:,2] < 100)).astype('uint8')
    signature_roi = np.zeros(yellow.shape, np.uint8)
    signature_roi[900:1550,1800:2750] = 1
    yellow *= signature_roi
    yellow = cv2.dilate(yellow, np.ones((7, 7), np.uint8)) > 0
    erase = (~protected) & (~yellow)
    erase[:100] = False
    mask = np.zeros(a.shape[:2], bool)
    mask[3800:] = erase
    a[mask] = 0
    result = Image.fromarray(a)
    icon_path = ROOT / 'produtos/_marca/icone-oficial/papagaio-icone-oficial-transparente.png'
    icon = Image.open(icon_path).convert('RGBA')
    icon = icon.crop(icon.getbbox())
    ia = np.array(icon).astype(float)
    # Green-channel ink separation preserves official feather paths/shading and
    # makes the original black dividing lines negative space in one-ink variants.
    alpha = np.uint8(np.clip(ia[:,:,1] / 255 * ia[:,:,3], 0, 255))
    ink = Image.new('RGBA', icon.size, (*color, 0))
    ink.putalpha(Image.fromarray(alpha))
    h = 1660
    ink = ink.resize((round(ink.width * h / ink.height), h), Image.Resampling.LANCZOS)
    position = (1400 - ink.width // 2, 4000)
    result.alpha_composite(ink, position)
    modified = np.array(result)
    # Upper typography must be pixel-identical, not a regenerated approximation.
    assert np.array_equal(np.array(original)[:3900], modified[:3900])
    # Validate original wave and signature pixels remain identical.
    preserved = np.zeros(mask.shape, bool)
    preserved[3800:] = protected | yellow
    assert np.array_equal(np.array(original)[preserved], modified[preserved])
    protected_ink = preserved & (np.array(original)[:,:,3] > 8)
    changed_protected = protected_ink & np.any(np.array(original) != modified, axis=2)
    if np.any(changed_protected):
        cy,cx=np.where(changed_protected)
        raise AssertionError(f'Protected ink overlap: {cx.min(),cy.min(),cx.max(),cy.max()} ({len(cx)}px)')
    dest = ART / f'{number}-original-com-icone-oficial.png'
    result.save(dest, dpi=(300,300))
    return dest, {'source':str(source(number).relative_to(ROOT)), 'sourceSha256':digest(source(number)),
                  'officialIconSha256':digest(icon_path), 'canvas':list(original.size),
                  'typographyPixelIdentical':True, 'wavesAndSignaturePixelIdentical':True,
                  'method':'replace old bird only; official PNG green-channel one-ink separation',
                  'iconPosition':list(position), 'iconSize':list(ink.size)}

def compose(number, art_path, quad):
    base_path = HERE / 'bases' / f'{number}-sem-estampa.png'
    photo = np.array(Image.open(base_path).convert('RGB')).astype(np.float32) / 255
    h,w = photo.shape[:2]
    artwork = Image.open(art_path).convert('RGBA')
    artwork = artwork.crop(artwork.getbbox())
    # Resize only for placement; full native print artwork remains saved separately.
    artwork.thumbnail((900,1400), Image.Resampling.LANCZOS)
    a = np.array(artwork).astype(np.float32)/255
    premul = np.concatenate((a[:,:,:3]*a[:,:,3:4], a[:,:,3:4]), axis=2)
    src = np.float32([[0,0],[a.shape[1]-1,0],[a.shape[1]-1,a.shape[0]-1],[0,a.shape[0]-1]])
    matrix = cv2.getPerspectiveTransform(src,np.float32(quad))
    layer = cv2.warpPerspective(premul,matrix,(w,h),flags=cv2.INTER_CUBIC)
    lum = cv2.cvtColor(photo,cv2.COLOR_RGB2GRAY)
    smooth = cv2.GaussianBlur(lum,(0,0),3)
    broad = cv2.GaussianBlur(lum,(0,0),22)
    # Small displacement from actual photographed folds; no fabricated lettering.
    yy,xx = np.mgrid[0:h,0:w].astype(np.float32)
    gx = cv2.Sobel(smooth,cv2.CV_32F,1,0,ksize=3)
    gy = cv2.Sobel(smooth,cv2.CV_32F,0,1,ksize=3)
    layer = cv2.remap(layer,xx+np.clip(gx*7,-1.8,1.8),yy+np.clip(gy*5,-1.2,1.2),cv2.INTER_CUBIC)
    alpha = np.clip(layer[:,:,3:4],0,1)
    straight = np.divide(layer[:,:,:3],np.maximum(alpha,1e-6))
    # Ink receives measured cloth microtexture and moderate broad fold shading.
    selected = alpha[:,:,0]>.15
    median = float(np.median(broad[selected]))
    lighting = np.clip(.88+.12*broad/max(median,.01)+(lum-smooth)*.65,.65,1.1)[:,:,None]
    # Matte ink retains a small measured cloth reflection, even in black areas.
    straight = np.clip((straight*.98+.012)*lighting,0,1)
    result = np.uint8(np.clip(photo*(1-alpha)+straight*alpha,0,1)*255+.5)
    dest = OUT / f'{number}-piloto-composicao.png'
    Image.fromarray(result).save(dest)
    # Store the registration/alpha layer separately to make the placement editable.
    layer_img = np.uint8(np.clip(np.concatenate((straight,alpha),axis=2),0,1)*255+.5)
    Image.fromarray(layer_img).save(OUT / f'{number}-camada-estampa.png')
    return {'number':number,'file':str(dest.relative_to(HERE)),'base':str(base_path.relative_to(HERE)),
            'artwork':str(art_path.relative_to(HERE)), 'quad':quad,'photoSize':[w,h],
            'nativePhotoSize':[w,h],'generatedPrint':False,'maxDisplacementPx':[1.8,1.2]}

if __name__ == '__main__':
    p08,check08=replace_icon('08',(0,199,33))
    p24,check24=replace_icon('24',(0,0,0))
    p23,check23=replace_icon('23',(255,255,255))
    p21=ART/'21-original-sem-redesenho.png'
    shutil.copy2(source('21'),p21)
    assert digest(p21)==digest(source('21'))
    jobs=[compose('08',p08,[[398,324],[650,338],[664,761],[380,770]]),
          compose('24',p24,[[420,405],[672,400],[688,800],[408,806]]),
          compose('21',p21,[[423,373],[661,370],[655,584],[433,588]])]
    report={'method':'AI blank garment photo + deterministic original-artwork composition',
            'checks':{'08':check08,'24':check24,'23':check23,'21':{'sourceSha256':digest(source('21')),'outputSha256':digest(p21),'identicalFile':True}},
            'pilots':jobs,'publication':'none; pilots awaiting visual validation'}
    (HERE/'composicao-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    sheet=Image.new('RGB',(1500,2100),'#dddddd'); d=ImageDraw.Draw(sheet)
    for i,row in enumerate(jobs):
        im=Image.open(HERE/row['file']);im.thumbnail((490,700));sheet.paste(im,(i*500,25));d.text((i*500+10,5),row['number'],fill='black')
        detail=Image.open(HERE/row['file']).crop((330,300,760,850));detail.thumbnail((490,700));sheet.paste(detail,(i*500,800))
        art=Image.open(HERE/row['artwork']).convert('RGBA');art=art.crop(art.getbbox());art.thumbnail((460,650));sheet.paste(art,(i*500+15,1400),art)
    sheet.save(HERE/'prancha-3-pilotos.jpg',quality=94)
    print('3 pilots composed; typography, waves, signature and original21 checks passed')
