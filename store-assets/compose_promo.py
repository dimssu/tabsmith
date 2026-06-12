"""Generate the 440x280 Chrome Web Store small promo tile."""
from PIL import Image, ImageFilter, ImageDraw, ImageFont
import os, glob

OUT = "store-assets/promo"
os.makedirs(OUT, exist_ok=True)

DESK = os.path.expanduser("~/Desktop")
SRC = sorted(glob.glob(f"{DESK}/Screenshot 2026-06-05 at 7.41*.png"))[0]
print("source:", SRC)

W, H = 440, 280
BG = (250, 247, 241)
INK = (31, 29, 26)
MUTED = (120, 110, 95)

def find_font(candidates, size):
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()

SERIF = ["/System/Library/Fonts/Supplemental/Charter.ttc",
         "/System/Library/Fonts/Supplemental/Georgia.ttf"]
SANS  = ["/System/Library/Fonts/SFNS.ttf",
         "/System/Library/Fonts/HelveticaNeue.ttc"]

def crop_sidepanel(img):
    w, h = img.size
    # Pixel-probed: side panel left ~2260, right ~3018. Margin both sides.
    return img.crop((2230, 320, w - 6, h - 30))

def round_corners(im, r=8):
    w, h = im.size
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0,0,w,h), radius=r, fill=255)
    out = Image.new("RGBA", (w, h), (0,0,0,0))
    out.paste(im, (0,0), mask)
    return out

def with_shadow(panel, blur=10, offset=(0, 4), alpha=110):
    pad = 24
    w, h = panel.size
    canvas = Image.new("RGBA", (w + pad*2, h + pad*2), (0,0,0,0))
    shadow = Image.new("RGBA", canvas.size, (0,0,0,0))
    sd = Image.new("RGBA", panel.size, (0,0,0,alpha))
    shadow.paste(sd, (pad + offset[0], pad + offset[1]))
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas = Image.alpha_composite(canvas, shadow)
    canvas.paste(panel.convert("RGBA"), (pad, pad), panel.convert("RGBA"))
    return canvas

# Load + crop the side panel
raw = Image.open(SRC).convert("RGB")
panel = crop_sidepanel(raw)
panel = round_corners(panel, r=10)

# Scale panel to fit on the right of the tile.
# Target panel height ~240 of 280 (room for margin), keep aspect.
target_h = 240
pw, ph = panel.size
scale = target_h / ph
panel = panel.resize((int(pw * scale), target_h), Image.LANCZOS)
shadowed = with_shadow(panel)

# Canvas
canvas = Image.new("RGB", (W, H), BG)
# subtle grain
grain = Image.effect_noise((W, H), 4).convert("L").point(lambda p: 245 + (p-128)//50)
grain_rgb = Image.merge("RGB", (grain, grain, grain)).convert("RGB")
canvas = Image.blend(canvas, grain_rgb, 0.15)

# Place panel on the right
px = W - shadowed.size[0] + 18
py = (H - shadowed.size[1]) // 2
canvas.paste(shadowed, (px, py), shadowed)

# Headline left
d = ImageDraw.Draw(canvas)
head_font = find_font(SERIF, 30)
sub_font  = find_font(SANS, 12)
tag_font  = find_font(SANS, 9)

tx = 22
ty = 78
def wrap(text, font, max_w):
    words = text.split()
    lines, cur = [], ""
    for word in words:
        trial = (cur + " " + word).strip()
        bbox = font.getbbox(trial)
        if bbox[2] - bbox[0] <= max_w:
            cur = trial
        else:
            if cur: lines.append(cur)
            cur = word
    if cur: lines.append(cur)
    return lines

# Compact headline
headline = "Tabs you\ncan think\nwith."
for i, line in enumerate(headline.split("\n")):
    d.text((tx, ty + i*34), line, font=head_font, fill=INK)

# Tiny tag
d.text((tx, H - 28), "100% ON-DEVICE", font=tag_font, fill=(150, 140, 125))

out_path = os.path.join(OUT, "promo-tile-440x280.png")
canvas.save(out_path, "PNG", optimize=True)
print("wrote", out_path, canvas.size)
