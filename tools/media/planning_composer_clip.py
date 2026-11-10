import subprocess, sys
import numpy as np

W, H = 1600, 900
BG = np.array([25, 25, 31], dtype=np.uint8)
SRC = 'images/work/planning-mode-flow.mp4'
VF = 'crop=456:863:0:205,pad=1600:900:592:18:color=0x19191f'

dec = subprocess.Popen(
    ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-t', '17.4', '-i', SRC,
     '-vf', VF, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    stdout=subprocess.PIPE)

frames = []
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3:
        break
    frames.append(np.frombuffer(buf, np.uint8).reshape(H, W, 3).copy())
print('frames', len(frames), file=sys.stderr)

# template: the "History (1)" label at t=6.5s
ref = frames[int(6.5 * 30)].astype(np.int16).mean(axis=2)
TX0, TX1 = 600, 760
band = ref[200:330, TX0:TX1]
rows = np.where((band > 110).sum(axis=1) > 3)[0]
ty0, ty1 = 200 + rows.min(), 200 + rows.max()
tpl = ref[ty0 - 2:ty1 + 3, TX0:TX1]
th = tpl.shape[0]
print('template rows', ty0, ty1, file=sys.stderr)

hits = []
for i, f in enumerate(frames):
    g = f.astype(np.int16).mean(axis=2)
    best, by = 1e9, None
    for y in range(18, 882 - th):
        d = np.abs(g[y:y + th, TX0:TX1] - tpl).mean()
        if d < best:
            best, by = d, y
    hit = best < 6
    if hit:
        c = by + th // 2
        y0, y1 = max(18, c - 46), min(881, c + 38)
        f[y0:y1, 598:1006] = BG
    hits.append((round(i / 30, 2), round(best, 2), by if hit else None))

def block(f):
    d = np.abs(f[18:882, 598:1004].astype(np.int16) - BG.astype(np.int16)).max(axis=2)
    rows = np.where((d > 12).sum(axis=1) > 2)[0] + 18
    if not len(rows):
        return None
    bottom = top = rows[-1]
    for y in reversed(rows[:-1]):
        if top - y > 40:
            break
        top = y
    return top, bottom

targets = []
for fi, f in enumerate(frames):
    top, bottom = block(f)
    # the skill menu is wider than the panel; keep its overhang, drop the 3D viewport
    edge = f[:, 1008:1048].copy()
    f[:, 1008:1048] = BG
    if fi < int(3.2 * 30):
        e16 = edge.astype(np.int16)
        neutral = ((e16[:, :, 2] - e16[:, :, 0]) < 14) & (e16.mean(axis=2) < 90)
        menu = neutral[:, 22]
        rows = [y for y in range(top, 790) if menu[y]]
        stops = []
        for y in rows:
            gaps = np.where(~neutral[y])[0]
            stops.append(gaps[0] if len(gaps) else len(neutral[y]))
        if rows:
            # one straight right edge per frame, with a border line like the menu's left side
            stop = int(np.median(stops))
            r0, r1 = rows[0], rows[-1]
            line = f[(r0 + r1) // 2, 592:700]
            lx = int(np.argmax(np.abs(line.astype(np.int16) - BG.astype(np.int16)).max(axis=1) > 12))
            for y in rows:
                f[y, 1008:1008 + stop] = edge[y, :stop]
                if r0 + 6 < y < r1 - 6:
                    f[y, 1008 + stop - 1] = f[y, 592 + lx]
    if bottom <= 866 and fi >= int(3.2 * 30):
        # composer showing after send: drop the queued-message chip above it (the skill menu while typing stays)
        top = max(top, 733)
    f[18:max(18, top - 3), 592:1008] = BG
    targets.append(450 - (top + bottom) / 2)

# hold each settled layout perfectly still; frames mid-change count toward the next settled layout
n = len(targets)
stable = [False] * n
i = 0
while i < n:
    j = i
    while j + 1 < n and abs(targets[j + 1] - targets[i]) < 3:
        j += 1
    if j - i + 1 >= 6:
        med = round(float(np.median(targets[i:j + 1])))
        brief = j - i + 1 < 26 and j < n - 1
        for k in range(i, j + 1):
            stable[k] = 'hold' if brief else med
    i = j + 1
# a brief layout (the Queued chip) keeps the previous position instead of bouncing
last = None
for k in range(n):
    if stable[k] == 'hold':
        stable[k] = last if last is not None else False
    elif stable[k] is not False:
        last = stable[k]
state = [None] * n
nxt = None
for k in range(n - 1, -1, -1):
    if stable[k] is not False:
        nxt = stable[k]
    state[k] = nxt
prev = None
for k in range(n):
    if state[k] is None:
        state[k] = prev
    prev = state[k]

# composer sits a little low so the skill menu that opens above it stays in frame
_composer = state[0]
state = [-276 if v == _composer else v for v in state]

def ease_out_back(u, c1=1.45):
    c3 = c1 + 1
    return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2

DUR = 20
offsets = []
cur = float(state[0])
frm, to, t0 = cur, cur, -DUR
COMPOSER = state[0]
morphs = []
for k in range(n):
    if state[k] != to:
        if COMPOSER in (state[k], state[k - 1]):
            morphs.append(k)
            frm, to, t0 = float(state[k]), float(state[k]), k - DUR
        else:
            frm, to, t0 = cur, float(state[k]), k
    u = min(1.0, (k - t0) / DUR)
    cur = frm + (to - frm) * ease_out_back(u)
    offsets.append(cur)

def shifted(f, o):
    out = np.empty_like(f)
    out[:] = BG
    if o >= 0:
        out[o:] = f[:H - o]
    else:
        out[:H + o] = f[-o:]
    return out

for idx, f in enumerate(frames):
    o = offsets[idx]
    lo = int(np.floor(o))
    a = o - lo
    if a < 1e-3:
        frames[idx] = shifted(f, lo)
    else:
        frames[idx] = (shifted(f, lo).astype(np.float32) * (1 - a) + shifted(f, lo + 1).astype(np.float32) * a + 0.5).astype(np.uint8)


# composer <-> Q&A: the outline stretches between the two shapes while content crossfades
MD = 20
XS = np.arange(592, 1008, dtype=np.float32)[None, :]
YS = np.arange(H, dtype=np.float32)[:, None]

def outline(f):
    sub = np.abs(f[:, 592:1008].astype(np.int16) - BG.astype(np.int16)).max(axis=2) > 12
    long_rows = np.where(sub.sum(axis=1) > 0.8 * 416)[0]
    top, bottom = long_rows.min(), long_rows.max()
    cols = np.where(sub[top:bottom + 1].sum(axis=0) > 0.6 * (bottom - top))[0] + 592
    return np.array([cols.min(), top, cols.max(), bottom], dtype=np.float32)

def border_color(f, r):
    x = int(r[0]); y = int((r[1] + r[3]) / 2)
    return f[y, x].astype(np.float32)

def sdf(r, rad):
    cx, cy = (r[0] + r[2]) / 2, (r[1] + r[3]) / 2
    bx, by = (r[2] - r[0]) / 2, (r[3] - r[1]) / 2
    qx = np.abs(XS - cx) - (bx - rad)
    qy = np.abs(YS - cy) - (by - rad)
    return np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2) + np.minimum(np.maximum(qx, qy), 0) - rad

def smooth(a, b, u):
    t = min(1.0, max(0.0, (u - a) / (b - a)))
    return t * t * (3 - 2 * t)

def spring(steps, zeta=0.62, freq=1.55):
    w = 2 * np.pi * freq
    x, v, out = 0.0, 0.0, []
    dt = 1 / 30
    for _ in range(steps):
        for _ in range(8):
            acc = -w * w * (x - 1) - 2 * zeta * w * v
            v += acc * dt / 8
            x += v * dt / 8
        out.append(x)
    return out

def vshift(img, dy):
    lo = int(np.floor(dy)); a = dy - lo
    r0 = np.roll(img, lo, axis=0)
    if a < 1e-3:
        return r0
    return r0 * (1 - a) + np.roll(img, lo + 1, axis=0) * a

MD = 24
CURVE = spring(MD)
for k in morphs:
    if k + MD >= n:
        continue
    A = frames[k - 1][:, 592:1008].astype(np.float32)
    B = frames[k + MD][:, 592:1008].astype(np.float32)
    ra, rb = outline(frames[k - 1]), outline(frames[k + MD])
    grow = state[k - 1] == COMPOSER
    rad_a, rad_b = (18.0, 11.0) if grow else (11.0, 18.0)
    col = (border_color(frames[k - 1], ra) + border_color(frames[k + MD], rb)) / 2
    bgf = BG.astype(np.float32)
    a_int = np.clip(-2.0 - sdf(ra, rad_a), 0, 1)[:, :, None]
    b_int = np.clip(-2.0 - sdf(rb, rad_b), 0, 1)[:, :, None]
    a_out = np.clip(sdf(ra, rad_a) - 3.0, 0, 1)[:, :, None]
    b_out = np.clip(sdf(rb, rad_b) - 3.0, 0, 1)[:, :, None]
    for j in range(MD):
        p = (j + 1) / (MD + 1)
        e = CURVE[j] + (1 - CURVE[j]) * smooth(0.7, 1.0, (j + 1) / MD)
        r = ra + (rb - ra) * e
        rad = rad_a + (rad_b - rad_a) * min(1.0, max(0.0, e))
        d = sdf(r, rad)[:, :, None]
        interior = np.clip(-1.0 - d, 0, 1)
        line = np.clip(1 - np.abs(d + 0.7) / 0.8, 0, 1)
        # the composer rides the bottom edge, the question card rides the top edge
        if grow:
            dya, dyb = r[3] - ra[3], r[1] - rb[1]
        else:
            dya, dyb = r[1] - ra[1], r[3] - rb[3]
        wa = 1 - smooth(0.0, 0.45, p)
        wb = smooth(0.12, 0.55, p)
        As = vshift(A, dya); Bs = vshift(B, dyb)
        mA = vshift(a_int, dya) * interior * wa
        mB = vshift(b_int, dyb) * interior * wb
        panel = np.empty((H, 416, 3), np.float32)
        panel[:] = bgf
        panel = panel + (As - panel) * mA
        panel = panel + (Bs - panel) * mB
        # content outside the outline (the keyboard hint) fades with its side
        oa = vshift(a_out, r[3] - ra[3]) * (1 - smooth(0.0, 0.3, p)) * (1 - interior)
        ob = vshift(b_out, r[3] - rb[3]) * smooth(0.65, 1.0, p) * (1 - interior)
        panel = panel + (vshift(A, r[3] - ra[3]) - panel) * oa
        panel = panel + (vshift(B, r[3] - rb[3]) - panel) * ob
        panel = panel + (col - panel) * line
        out = frames[k + j].copy()
        out[:] = BG
        out[:, 592:1008] = np.clip(panel + 0.5, 0, 255).astype(np.uint8)
        frames[k + j] = out
print('morphs at', [round(k / 30, 2) for k in morphs], file=sys.stderr)

import json
json.dump(offsets, open('/tmp/offsets.json', 'w'))

enc = subprocess.Popen(
    ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
     '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '30', '-i', '-',
     '-vf', 'crop=1280:720:160:90,scale=1600:900:flags=lanczos,tpad=stop_mode=clone:stop_duration=1.0,format=yuv420p',
     '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart',
     'images/work/planning-mode-chat-dark.mp4'],
    stdin=subprocess.PIPE)
for f in frames:
    enc.stdin.write(f.tobytes())
enc.stdin.close()
enc.wait()
