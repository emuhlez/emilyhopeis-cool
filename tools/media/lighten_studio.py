import os, subprocess, sys
import numpy as np

STILL = GENERIC = False
KEEP_RECT = None

def probe_size(src):
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
                                   '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src]).decode()
    return tuple(map(int, out.strip().split(',')[:2]))

def decoder(src):
    return subprocess.Popen(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', src,
                             '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)

def frames_of(proc, w, h):
    n = w * h * 3
    while True:
        buf = proc.stdout.read(n)
        if len(buf) < n:
            return
        yield np.frombuffer(buf, np.uint8).reshape(h, w, 3)

def encoder(out, w, h, still=False):
    if still:
        args = ['-q:v', '2'] if out.endswith('.jpg') else []
        return subprocess.Popen(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo',
                                 '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-i', '-', *args, '-frames:v', '1', out],
                                stdin=subprocess.PIPE)
    return subprocess.Popen(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                             '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', '30', '-i', '-',
                             '-vf', 'format=yuv420p', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22',
                             '-movflags', '+faststart', out], stdin=subprocess.PIPE)

# Roblox Studio Foundation tokens (RbxDesignFoundations/Default), dark mean luminance -> light RGB
POINTS = [
    (0, (255, 255, 255)),
    (19, (255, 255, 255)),     # Surface_0       18,18,21    -> 255,255,255
    (27, (247, 247, 248)),     # Surface_100     25,26,31    -> 247,247,248
    (35, (255, 255, 255)),     # Surface_200     32,34,39    -> 255,255,255
    (43, (247, 247, 248)),     # Surface_300     39,41,48    -> 247,247,248
    (56, (228, 229, 234)),     # Stroke.Default  over Surface_200
    (193, (106, 111, 129)),    # Content.Muted   188,190,200 -> 106,111,129
    (216, (73, 77, 90)),       # Content.Default 213,215,221 -> 73,77,90
    (247, (32, 34, 39)),       # Content.Emphasis 247,247,248 -> 32,34,39
    (255, (28, 30, 34)),
]
xs = np.array([p[0] for p in POINTS], np.float32)
LUT = np.stack([np.interp(np.arange(256), xs, [p[1][c] for p in POINTS]) for c in range(3)], 1).astype(np.float32)
SURF_LIGHT = np.array([247, 247, 248], np.float32)

def shift_max(m, r):
    out = m.copy()
    for _ in range(r):
        n = out.copy()
        n[1:] |= out[:-1]; n[:-1] |= out[1:]
        n[:, 1:] |= out[:, :-1]; n[:, :-1] |= out[:, 1:]
        out = n
    return out

def shift_min(m, r):
    return ~shift_max(~m, r)

SURF_POINTS = [(0, 255), (19, 255), (27, 247.5), (35, 239), (43, 231), (51, 223), (120, 170)]
SURF_LUT = np.interp(np.arange(256), [p[0] for p in SURF_POINTS], [p[1] for p in SURF_POINTS]).astype(np.float32)
# foreground coverage over the surface -> light coverage and ink, fitted so Stroke / Content.Muted /
# Content.Default / Content.Emphasis land on their light token values
A_IN = [0.0, 0.064, 0.24, 0.754, 0.86, 1.0]
A_OUT = [0.0, 0.116, 0.16, 0.64, 0.80, 1.0]
INK = np.array([(27, 37, 75), (27, 37, 75), (27, 37, 75), (26.7, 34.7, 62.6), (29.5, 34.5, 50.8), (32, 34, 39)], np.float32)
BLUE = np.array([51, 95, 255], np.float32)

def run_min(a, r, axis):
    out = a.copy()
    for d in range(1, r + 1):
        out = np.minimum(out, np.roll(a, d, axis)); out = np.minimum(out, np.roll(a, -d, axis))
    return out

def run_max(a, r, axis):
    out = a.copy()
    for d in range(1, r + 1):
        out = np.maximum(out, np.roll(a, d, axis)); out = np.maximum(out, np.roll(a, -d, axis))
    return out

def opening(a, r):
    return run_max(run_max(run_min(run_min(a, r, 0), r, 1), r, 0), r, 1)

def convert(f):
    f = f.astype(np.float32)
    lum = f.mean(axis=2)
    sat = f.max(axis=2) - f.min(axis=2)
    bg = opening(lum, 4)
    bg_l = SURF_LUT[np.clip(bg.round(), 0, 255).astype(np.int32)][:, :, None]
    a = np.clip((lum - bg) / np.maximum(247 - bg, 1), 0, 1)
    a2 = np.interp(a, A_IN, A_OUT)[:, :, None]
    ink = np.stack([np.interp(a, A_IN, INK[:, c]) for c in range(3)], 2)
    out = bg_l + a2 * (ink - bg_l)
    shade = np.minimum(lum - bg, 0)[:, :, None] * 0.35
    out = out + shade
    keep = sat > 40
    if KEEP_RECT:
        x0, y0, x1, y1 = KEEP_RECT
        keep[y0 + 6:y1 - 6, x0 + 6:x1 - 6] = False
    if keep.any():
        keep = shift_min(shift_max(keep, 6), 6)
        if GENERIC:
            # colored icons: composite each pixel's coverage of the purest nearby color over the light surface
            ys, xs = np.where(keep)
            ya, yb = max(ys.min() - 6, 0), ys.max() + 7
            xa, xb = max(xs.min() - 6, 0), xs.max() + 7
            fs, ss, bs, ls = f[ya:yb, xa:xb], sat[ya:yb, xa:xb], bg_l[ya:yb, xa:xb], lum[ya:yb, xa:xb]
            best, pure = ss.copy(), fs.copy()
            for dy in range(-5, 6):
                for dx in range(-5, 6):
                    s2 = np.roll(ss, (dy, dx), (0, 1))
                    m = s2 > best
                    best[m] = s2[m]
                    pure[m] = np.roll(fs, (dy, dx), (0, 1))[m]
            # tiny text never reaches full coverage; lift dim references to Content.Link brightness
            pm = pure.mean(axis=2, keepdims=True)
            pure = np.where(pm < 115, np.clip(pure * (115 / np.maximum(pm, 1)), 0, 255), pure)
            # chroma is subsampled in the sources, so take coverage from full-resolution luminance
            bgs = bg[ya:yb, xa:xb]
            cov = np.clip((ls - bgs) / np.maximum(pure.mean(axis=2) - bgs, 1), 0, 1)[:, :, None]
            sub = bs + cov * (pure - bs)
            sub = np.where((bgs > 90)[:, :, None], fs, sub)
            col = out.copy()
            col[ya:yb, xa:xb] = sub
        else:
            # ActionEmphasis is the same blue in both themes; composite by blue coverage over the light card
            cov = np.clip((sat - 8) / (204 - 8), 0, 1)[:, :, None]
            col = SURF_LIGHT + cov * (BLUE - SURF_LIGHT)
        out[keep] = col[keep]
    if KEEP_RECT:
        x0, y0, x1, y1 = KEEP_RECT
        out[y0:y1, x0:x1] = f[y0:y1, x0:x1]
    return np.clip(out, 0, 255).astype(np.uint8)

if __name__ == '__main__':
    SRC, OUT = sys.argv[1], sys.argv[2]
    W, H = probe_size(SRC)
    STILL = SRC.endswith(('.png', '.jpg'))
    GENERIC = STILL or bool(os.environ.get('GENERIC'))
    KEEP_RECT = tuple(map(int, sys.argv[3].split(','))) if len(sys.argv) > 3 else None
    dec = decoder(SRC)
    enc = encoder(OUT, W, H, STILL)
    start = int(os.environ.get('START', 0)); count = int(os.environ.get('COUNT', 10 ** 9))
    for i, f in enumerate(frames_of(dec, W, H)):
        if i < start:
            continue
        if i >= start + count:
            break
        enc.stdin.write(convert(f).tobytes())
    dec.kill()
    enc.stdin.close()
    enc.wait()
