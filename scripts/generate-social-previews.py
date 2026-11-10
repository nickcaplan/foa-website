"""Build the four 1200x630 social cards from the site's existing Fayre art."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
root=Path(__file__).resolve().parent.parent
art=Image.open(root/'assets/brand/narnia-hero-landscape.webp').convert('RGB')
serif='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
sans='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
cards={
 'home':('THE FRIENDS OF ASHLEY',['Ashley School','PTA'],['School events, community','and fundraising']),
 'whats-on':('THE FRIENDS OF ASHLEY',["What's on",'at Ashley'],['School events','Term by term']),
 'christmas-fayre':('THE FRIENDS OF ASHLEY',['Christmas','Fayre'],['Saturday 5 December 2026','12:00 - 15:00  |  Ashley School']),
 'fayre-volunteering':('CHRISTMAS FAYRE',['Come and','volunteer'],['Saturday 5 December 2026','Choose your activity and slot'])
}
for key,(kicker,title,lines) in cards.items():
 im=ImageOps.fit(art,(1200,630));overlay=Image.new('RGBA',im.size)
 for x in range(1200):
  alpha=240 if x<500 else int(240*(1-(x-500)/700))
  ImageDraw.Draw(overlay).line([(x,0),(x,630)],fill=(5,33,29,max(20,alpha)))
 im=Image.alpha_composite(im.convert('RGBA'),overlay);d=ImageDraw.Draw(im)
 d.rounded_rectangle((24,24,1176,606),radius=15,outline='#b99a5b',width=2)
 d.text((64,70),kicker,font=ImageFont.truetype(sans,24),fill='#edcb83')
 for i,t in enumerate(title):d.text((60,153+i*98),t,font=ImageFont.truetype(serif,80),fill='#fff3d5')
 d.line((64,396,520,396),fill='#b99a5b',width=2)
 for i,t in enumerate(lines):d.text((64,429+i*45),t,font=ImageFont.truetype(sans,27),fill='#fff3d5')
 im.convert('RGB').save(root/f'assets/social/{key}-2026-v1.jpg',quality=93,optimize=True)
 im.convert('RGB').resize((360,189)).save(f'/tmp/social-{key}-thumb.jpg',quality=90)
 print(key,im.size)
