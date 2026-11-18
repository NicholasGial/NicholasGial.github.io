from pathlib import Path
from PIL import Image, ImageOps
import json, re, html
root=Path(__file__).resolve().parents[1]
photos=json.loads((root/'content/photos.json').read_text())
out=root/'dist/assets'; out.mkdir(parents=True,exist_ok=True)
for photo in photos:
    source=root.parent/'Photos'/photo['source']
    with Image.open(source) as raw:
        im=ImageOps.exif_transpose(raw).convert('RGB')
        for size,quality in [(640,83),(1200,86),(2000,90)]:
            target=out/f"{photo['id']}-{size}.webp"
            thumb=im.copy(); thumb.thumbnail((size,size))
            thumb.save(target,'WEBP',quality=quality,method=6)
    print(photo['id'])
with Image.open(root.parent/'profile_photo.jpg') as raw:
    im=ImageOps.exif_transpose(raw).convert('RGB'); im.thumbnail((900,1100)); im.save(out/'portrait.webp','WEBP',quality=88)
(root/'dist/photos.json').write_text(json.dumps(photos,indent=2)+'\n')
page_path=root/'dist/index.html'
page=page_path.read_text()
for photo in photos:
    photo_id=photo['id']
    variants=[]
    for size in (640,1200,2000):
        with Image.open(out/f'{photo_id}-{size}.webp') as derivative:
            variants.append(f'assets/{photo_id}-{size}.webp {derivative.width}w')
    def update_card(match):
        card=match.group(0)
        image=f'<img src="assets/{photo_id}-1200.webp" srcset="{", ".join(variants)}" sizes="(max-width: 680px) 88vw, {"88vw" if photo_id=="skyline" else "48vw"}" alt="{html.escape(photo["alt"],quote=True)}" width="{photo["width"]}" height="{photo["height"]}" loading="lazy">'
        card=re.sub(r'<img\b[^>]*>',lambda _:image,card,count=1)
        card=re.sub(r'(<figcaption><span>).*?(</span>)',lambda m:m[1]+html.escape(photo['title'])+m[2],card,count=1)
        return card
    page=re.sub(r'<a\b[^>]*data-photo="'+re.escape(photo_id)+r'"[^>]*>.*?</a>',update_card,page,flags=re.S)
page_path.write_text(page)
