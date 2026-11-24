import math
from PIL import Image, ImageDraw, ImageFilter

def create_icon(size: int) -> Image.Image:
    # Render at 4x scale for super-sampled anti-aliasing
    scale = 4
    render_size = size * scale
    
    img = Image.new('RGBA', (render_size, render_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Dimensions
    pad = int(render_size * 0.06)
    radius = int(render_size * 0.22)
    box = [pad, pad, render_size - pad, render_size - pad]
    
    # 1. Subtle squircle shadow
    shadow_img = Image.new('RGBA', (render_size, render_size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_img)
    shadow_pad = pad + int(render_size * 0.02)
    shadow_box = [shadow_pad, shadow_pad + int(render_size * 0.03), render_size - shadow_pad, render_size - shadow_pad + int(render_size * 0.03)]
    shadow_draw.rounded_rectangle(shadow_box, radius=radius, fill=(0, 112, 243, 60))
    shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(int(render_size * 0.04)))
    img = Image.alpha_composite(img, shadow_img)
    draw = ImageDraw.Draw(img)
    
    # 2. Background rounded squircle (dark sleek gradient simulation)
    # We draw vertical gradient slices inside a mask
    mask = Image.new('L', (render_size, render_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(box, radius=radius, fill=255)
    
    bg_gradient = Image.new('RGBA', (render_size, render_size))
    bg_draw = ImageDraw.Draw(bg_gradient)
    
    for y in range(box[1], box[3]):
        ratio = (y - box[1]) / (box[3] - box[1])
        # Dark tech slate gradient: from rgb(24, 30, 42) down to rgb(10, 14, 22)
        r = int(24 * (1 - ratio) + 10 * ratio)
        g = int(32 * (1 - ratio) + 14 * ratio)
        b = int(48 * (1 - ratio) + 24 * ratio)
        bg_draw.line([(box[0], y), (box[2], y)], fill=(r, g, b, 255))
        
    img.paste(bg_gradient, (0, 0), mask)
    
    # 3. Outer border/glow on squircle
    draw.rounded_rectangle(box, radius=radius, outline=(62, 166, 255, 120), width=max(1, int(scale * 1.5)))
    
    # 4. Skip Icon Symbol (⏭)
    # Composed of two triangles and one vertical bar
    # Bounding box for symbol inside squircle:
    sym_left = int(render_size * 0.26)
    sym_right = int(render_size * 0.76)
    sym_top = int(render_size * 0.28)
    sym_bottom = int(render_size * 0.72)
    sym_h = sym_bottom - sym_top
    sym_mid_y = (sym_top + sym_bottom) // 2
    
    # Widths:
    tri_w = int(sym_h * 0.44)
    gap = int(sym_h * 0.07)
    bar_w = int(sym_h * 0.14)
    bar_radius = max(1, int(bar_w // 3))
    
    # Triangle 1:
    t1_x1 = sym_left
    t1_x2 = t1_x1 + tri_w
    
    # Triangle 2:
    t2_x1 = t1_x2 + gap
    t2_x2 = t2_x1 + tri_w
    
    # Bar:
    b_x1 = t2_x2 + gap
    b_x2 = b_x1 + bar_w
    
    # Render symbol into high-res mask for gradient fill
    sym_mask = Image.new('L', (render_size, render_size), 0)
    sym_draw = ImageDraw.Draw(sym_mask)
    
    # Triangle 1
    sym_draw.polygon([
        (t1_x1, sym_top),
        (t1_x2, sym_mid_y),
        (t1_x1, sym_bottom)
    ], fill=255)
    
    # Triangle 2
    sym_draw.polygon([
        (t2_x1, sym_top),
        (t2_x2, sym_mid_y),
        (t2_x1, sym_bottom)
    ], fill=255)
    
    # Vertical bar
    sym_draw.rounded_rectangle(
        [b_x1, sym_top, b_x2, sym_bottom],
        radius=bar_radius,
        fill=255
    )
    
    # Subtle symbol glow
    sym_glow = Image.new('RGBA', (render_size, render_size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(sym_glow)
    glow_draw.bitmap((0, 0), sym_mask, fill=(62, 166, 255, 140))
    sym_glow = sym_glow.filter(ImageFilter.GaussianBlur(int(render_size * 0.035)))
    img = Image.alpha_composite(img, sym_glow)
    
    # Symbol Gradient: Electric Cyan (#00f0ff) to Vibrant Azure (#0072ff)
    sym_grad = Image.new('RGBA', (render_size, render_size))
    sym_grad_draw = ImageDraw.Draw(sym_grad)
    for y in range(sym_top, sym_bottom + 1):
        ratio = (y - sym_top) / max(1, sym_bottom - sym_top)
        r = int(0 * (1 - ratio) + 0 * ratio)
        g = int(225 * (1 - ratio) + 120 * ratio)
        b = int(255 * (1 - ratio) + 255 * ratio)
        sym_grad_draw.line([(0, y), (render_size, y)], fill=(r, g, b, 255))
        
    img.paste(sym_grad, (0, 0), sym_mask)
    
    # Downsample cleanly with Lanczos filter
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

# Generate all required icon sizes
sizes = [16, 32, 48, 96, 128, 512]
for s in sizes:
    icon = create_icon(s)
    path = f"/home/kuzzi/Dev/C O D E/ski/ski/public/icon/{s}.png" if s != 512 else "/home/kuzzi/Dev/C O D E/ski/ski/public/icon/512.png"
    icon.save(path, "PNG", optimize=True)
    print(f"Generated {s}x{s} icon -> {path}")

print("All PNG icons generated successfully!")

