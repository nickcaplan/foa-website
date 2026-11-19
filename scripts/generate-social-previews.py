"""Build the four 1200x630 social cards using the site's year-round branding and Fayre art."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
root=Path(__file__).resolve().parent.parent
art=Image.open(root/'assets/brand/narnia-hero-landscape.webp').convert('RGB')
serif='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
sans='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
cards={
 'art-competition':('ASHLEY SCHOOL CHRISTMAS FAYRE',['Art','Competition'],['Narnia theme','Deadline Monday 30th November']),
 'home':('THE FRIENDS OF ASHLEY',['Ashley School','PTA'],['School events, community','and fundraising']),
 'whats-on':('THE FRIENDS OF ASHLEY',["What's on",'at Ashley'],['School events','Term by term']),
 'christmas-fayre':('THE FRIENDS OF ASHLEY',['Christmas','Fayre'],['Saturday 5 December 2026','12:00 - 15:00  |  Ashley School']),
 'fayre-volunteering':('THE FRIENDS OF ASHLEY',['Volunteer','at the Fayre'],['Saturday 5 December 2026','12:00 - 15:00  |  Ashley School']),
 'fayre-supporters':('ASHLEY SCHOOL CHRISTMAS FAYRE',['Fayre','Supporters'],['Thank you to our sponsors:','Martin Flashman and Co, Ottershaw','Christmas Tree Farm, The Glitter Tree'])
}
for key,(kicker,title,lines) in cards.items():
 if len(sys.argv)>1 and key not in sys.argv[1:]:continue
 im=ImageOps.fit(art,(1200,630));overlay=Image.new('RGBA',im.size)
 for x in range(1200):
  alpha=240 if x<500 else int(240*(1-(x-500)/700))
  ImageDraw.Draw(overlay).line([(x,0),(x,630)],fill=(5,33,29,max(20,alpha)))
 im=Image.alpha_composite(im.convert('RGBA'),overlay)
 if key=='art-competition':
  # Framed canvas on an easel, matching the page hero, over a dark gallery wall.
  im=Image.new('RGBA',(1200,630),'#102d38')
  piece=ImageOps.fit(art,(452,254))
  mat=10;fr=9;fx,fy=640,120
  fw,fh=piece.width+2*(mat+fr),piece.height+2*(mat+fr)
  frame=Image.new('RGBA',(fw,fh),(0,0,0,0));fd=ImageDraw.Draw(frame)
  fd.rectangle((0,0,fw-1,fh-1),fill='#8a5a2b')
  fd.rectangle((3,3,fw-4,fh-4),outline='#5d3d1e',width=2)
  fd.rectangle((fr-2,fr-2,fw-fr+1,fh-fr+1),outline='#c9a65f',width=2)
  frame.paste(piece,(fr+mat,fr+mat))
  # cream mat ring
  for i in range(mat):
   fd.rectangle((fr+i,fr+i,fw-fr-1-i,fh-fr-1-i),outline='#f3e6c8')
  # easel legs
  ld=ImageDraw.Draw(im)
  hip=fy+fh
  ld.line((fx+int(fw*0.18),hip,fx+int(fw*0.18)-26,hip+92),fill='#6b4a2f',width=9)
  ld.line((fx+int(fw*0.82),hip,fx+int(fw*0.82)+26,hip+92),fill='#6b4a2f',width=9)
  sh=Image.new('RGBA',(fw+60,40),(0,0,0,0));ImageDraw.Draw(sh).ellipse((0,10,fw+60,40),fill=(0,0,0,110))
  sh=sh.resize((fw+60,24));im.alpha_composite(sh,(fx-30,fy+fh-6))
  im.alpha_composite(frame,(fx,fy))
 if key in ('home','whats-on'):
  im=Image.new('RGBA',(1200,630),'#0b3826')
  logo=Image.open(root/'assets/brand/foa-logo-og.png').convert('RGBA').crop((280,0,920,630))
  logo.thumbnail((420,420));im.alpha_composite(logo,(712,105))
 d=ImageDraw.Draw(im)
 d.rounded_rectangle((24,24,1176,606),radius=15,outline='#b99a5b',width=2)
 d.text((64,70),kicker,font=ImageFont.truetype(sans,24),fill='#edcb83')
 for i,t in enumerate(title):d.text((60,153+i*98),t,font=ImageFont.truetype(serif,66 if key=='art-competition' else (72 if key=='fayre-volunteering' else 80)),fill='#fff3d5')
 d.line((64,396,520,396),fill='#b99a5b',width=2)
 for i,t in enumerate(lines):d.text((64,429+i*45),t,font=ImageFont.truetype(sans,27),fill='#fff3d5')
 version='v3' if key in ('home','whats-on') else ('v1' if key in ('christmas-fayre','fayre-supporters') else 'v2')
 im.convert('RGB').save(root/f'assets/social/{key}-2026-{version}.jpg',quality=93,optimize=True)
 im.convert('RGB').resize((360,189)).save(f'/tmp/social-{key}-thumb.jpg',quality=90)
 print(key,im.size)
