#!/usr/bin/env python3
"""Create the explicitly labeled, non-statutory sample tablet processing log."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'reports' / 'tablet-recovery-log-sample.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
pdfmetrics.registerFont(TTFont('EcoSample', FONT))
pdfmetrics.registerFont(TTFont('EcoSampleBold', BOLD))

c = canvas.Canvas(str(OUT), pagesize=A4)
c.setTitle('EcoTrace India - Sample Tablet Processing Log')
c.setAuthor('EcoTrace India sample records')
w, h = A4
c.setFillColorRGB(.025, .19, .135); c.rect(0, h-172, w, 172, fill=1, stroke=0)
c.setFillColorRGB(.73, .94, .65); c.setFont('EcoSampleBold', 9); c.drawString(44, h-47, 'ECOTRACE INDIA / SAMPLE MATERIAL RECORD')
c.setFillColorRGB(1,1,1); c.setFont('EcoSampleBold', 21); c.drawString(44,h-87,'Tablet processing log')
c.setFont('EcoSample', 10); c.setFillColorRGB(.85,.96,.87); c.drawString(44,h-112,'Phagwara collection point / internal chain-of-custody example')
c.setFont('EcoSampleBold', 8); c.setFillColorRGB(.99,.82,.42); c.drawString(44,h-141,'SAMPLE DOCUMENT ONLY — NOT A CPCB CERTIFICATE OR EPR CREDIT')

x = 44; y = h-211
c.setFillColorRGB(.13,.28,.22); c.setFont('EcoSampleBold', 11); c.drawString(x,y,'RECORD IDENTIFIERS')
y-=23
for label, value in [
    ('Processing reference', 'REC-PGW-2026-TABLET-01'),
    ('Product listing', 'LIST-PGW-TABLET-01'),
    ('Collection request', 'ECO-2026-TABLET-01'),
    ('Recycling batch', 'BATCH-2026-PGW-TABLET'),
    ('Item', '1 illustrated tablet / category: Tablets'),
]:
    c.setFont('EcoSample',9); c.setFillColorRGB(.36,.45,.40); c.drawString(x,y,label)
    c.setFont('EcoSampleBold',9); c.setFillColorRGB(.05,.29,.2); c.drawRightString(w-44,y,value)
    c.setStrokeColorRGB(.87,.92,.88); c.line(x,y-8,w-44,y-8)
    y-=32

y-=8; c.setFont('EcoSampleBold',11); c.setFillColorRGB(.13,.28,.22); c.drawString(x,y,'MASS BALANCE / PHYSICAL CHECKPOINTS')
y-=25
for label,value in [
    ('Initial category reference estimate', '~0.52 kg (not a measurement)'),
    ('Physical collection weight', '0.58 kg (sample scale record)'),
    ('Recycler intake weight', '0.56 kg (sample gate record)'),
    ('Documented recovered materials', '0.53 kg (internal sample log)'),
]:
    c.setFont('EcoSample',9); c.setFillColorRGB(.36,.45,.40); c.drawString(x,y,label)
    c.setFont('EcoSampleBold',9); c.setFillColorRGB(.05,.29,.2); c.drawRightString(w-44,y,value)
    y-=26

y-=12; c.setFont('EcoSampleBold',11); c.setFillColorRGB(.13,.28,.22); c.drawString(x,y,'DOCUMENTED FRACTIONS (SAMPLE)')
y-=25
for label,value in [('Metals','0.12 kg'),('Plastics','0.14 kg'),('Glass','0.19 kg'),('Circuit-board fraction','0.08 kg'),('Hazardous material isolated (tracked separately)','0.02 kg')]:
    c.setFont('EcoSample',9); c.setFillColorRGB(.36,.45,.40); c.drawString(x,y,label)
    c.setFont('EcoSampleBold',9); c.setFillColorRGB(.05,.29,.2); c.drawRightString(w-44,y,value)
    y-=23

y-=8; c.setFillColorRGB(.95,.98,.95); c.roundRect(44,y-81,w-88,91,11,fill=1,stroke=0)
c.setFillColorRGB(.08,.29,.2); c.setFont('EcoSampleBold',9); c.drawString(57,y-17,'DATA & FINANCE CLARITY')
c.setFont('EcoSample',8); c.drawString(57,y-37,'The 0.53 kg is an internal sample processing record, not a statutory EPR credit.')
c.drawString(57,y-54,'The separate customer wallet entry is simulated; no bank transfer occurred.')
c.drawString(57,y-71,'Facility listings and timestamps are illustrative entries for a course project.')

c.setFont('EcoSample',8);c.setFillColorRGB(.38,.49,.42)
c.drawString(44,39,'EcoTrace India | Source photo: Karolina Grabowska / Pexels (licensed stock).')
c.drawRightString(w-44,39,'Sample document | 1 / 1')
c.save()
print(f'Generated: {OUT} ({OUT.stat().st_size} bytes)')
