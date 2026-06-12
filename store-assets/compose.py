"""Compose marketing-grade product shots from the canonical Quarto screenshots.

Source of truth is store-assets/screenshots/*.png — already-cropped product
panels straight from the side panel / popup. This script frames each one on a
warm off-white canvas with a soft shadow and a quiet editorial headline, then
writes 1280x800 tiles ready for the Chrome Web Store.

Run:  python3 store-assets/compose.py    (needs Pillow)
"""
from PIL import Image, ImageFilter, ImageDraw, ImageFont
import os

SRC = "store-assets/screenshots"
OUT = "store-assets/showcase-1280"
os.makedirs(OUT, exist_ok=True)

W, H = 1280, 800
BG = (250, 247, 241)            # warm off-white
INK = (31, 29, 26)              # warm graphite
MUTED = (120, 110, 95)

# (source filename, headline, subhead, kind)
SHOTS = [
    ("01-suggestions.png",
     "Tabs you can think with.",
     "Smart group suggestions, fully on-device.",
     "sidepanel"),
    ("02-command-palette.png",
     "Cmd+K, across every tab.",
     "Fast search. Zero round-trips.",
     "sidepanel"),
    ("03-quick-capture-popup.png",
     "Capture the thought. Close the tab.",
     "Notes, reminders, and group hints from the toolbar.",
     "popup"),
    ("04-note-and-reminder.png",
     "Why did I open this?",
     "A short note per URL, so context survives the close.",
     "sidepanel"),
]

def find_font(candidates, size):
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()

SERIF = ["/System/Library/Fonts/Supplemental/Charter.ttc",
         "/System/Library/Fonts/Supplemental/Georgia.ttf",
         "/System/Library/Fonts/Supplemental/Times New Roman.ttf"]
SANS  = ["/System/Library/Fonts/SFNS.ttf",
         "/System/Library/Fonts/HelveticaNeue.ttc",
         "/Library/Fonts/Arial.ttf"]

def round_corners(im, r=22):
    w, h = im.size
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w, h), radius=r, fill=255)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    return out

def with_shadow(panel, blur=22, offset=(0, 12), alpha=120):
    pad = 60
    w, h = panel.size
    canvas = Image.new("RGBA", (w + pad*2, h + pad*2), (0, 0, 0, 0))
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = Image.new("RGBA", panel.size, (0, 0, 0, alpha))
    shadow.paste(sd, (pad + offset[0], pad + offset[1]))
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas = Image.alpha_composite(canvas, shadow)
    canvas.paste(panel.convert("RGBA"), (pad, pad), panel.convert("RGBA"))
    return canvas

def wrap(text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for word in words:
        trial = (cur + " " + word).strip()
        bbox = font.getbbox(trial)
        if bbox[2] - bbox[0] <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines

def compose(src_name, headline, sub, kind, out_name):
    panel = Image.open(os.path.join(SRC, src_name)).convert("RGB")
    panel = round_corners(panel, r=22)

    # Fit the panel inside the canvas with breathing room.
    max_h = 680
    target_w = 470 if kind == "sidepanel" else 430
    pw, ph = panel.size
    scale = min(target_w / pw, max_h / ph)
    panel = panel.resize((int(pw * scale), int(ph * scale)), Image.LANCZOS)
    shadowed = with_shadow(panel)

    canvas = Image.new("RGB", (W, H), BG)
    grain = Image.effect_noise((W, H), 6).convert("L").point(lambda p: 245 + (p - 128)//40)
    canvas = Image.blend(canvas, Image.merge("RGB", (grain, grain, grain)), 0.18)

    # Side panel hugs the right edge (native to Chrome); popup floats inside.
    px = (W - shadowed.size[0] + 40) if kind == "sidepanel" else (W - shadowed.size[0] - 30)
    py = (H - shadowed.size[1]) // 2
    canvas.paste(shadowed, (px, py), shadowed)

    d = ImageDraw.Draw(canvas)
    head_font = find_font(SERIF, 54)
    sub_font = find_font(SANS, 21)
    tag_font = find_font(SANS, 14)

    tx, ty = 76, 250
    lines = wrap(headline, head_font, 560)
    for i, line in enumerate(lines):
        d.text((tx, ty + i*62), line, font=head_font, fill=INK)
    sub_y = ty + len(lines)*62 + 16
    for i, line in enumerate(wrap(sub, sub_font, 500)):
        d.text((tx, sub_y + i*28), line, font=sub_font, fill=MUTED)

    d.text((tx, H - 76), "100% ON-DEVICE  ·  NO TELEMETRY  ·  NO SYNC",
           font=tag_font, fill=(150, 140, 125))

    out_path = os.path.join(OUT, out_name)
    canvas.save(out_path, "PNG", optimize=True)
    print("wrote", out_path, canvas.size)

for i, (src, headline, sub, kind) in enumerate(SHOTS):
    compose(src, headline, sub, kind, f"0{i+1}-showcase.png")

print("done")
