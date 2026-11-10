"""Erase the Assistant's stacked "History (1)" box from full-Studio recordings.
usage: SRC OUT   (SRC is a dark 1920x1080 recording or still; history_label.npy is the label template)"""
import sys
import numpy as np
from scipy.signal import fftconvolve
import os
sys.path.insert(0, os.path.dirname(__file__))
import lighten_studio as ls

PX0, PX1, PY0, PY1 = 0, 418, 255, 1075   # Assistant panel
BG = np.array([25, 25, 31], np.uint8)     # Surface_100
def gray(f):
    return f.astype(np.float32).mean(axis=2)

TPL = np.load(os.path.join(os.path.dirname(__file__), 'history_label.npy'))
TPL_Z = (TPL - TPL.mean()) / (TPL.std() + 1e-6)

def find_label(g):
    p = g[PY0:PY1, PX0:PX1]
    th, tw = TPL.shape
    num = fftconvolve(p, TPL_Z[::-1, ::-1], mode='valid')
    ones = np.ones_like(TPL)
    s1 = fftconvolve(p, ones, mode='valid'); s2 = fftconvolve(p * p, ones, mode='valid')
    n = th * tw
    sd = np.sqrt(np.maximum(s2 / n - (s1 / n) ** 2, 1.0))
    ncc = np.nan_to_num(num / (n * sd), nan=-1.0, posinf=-1.0, neginf=-1.0)
    y, x = np.unravel_index(np.argmax(ncc), ncc.shape)
    return (ncc[y, x], PY0 + y, PX0 + x)

def is_line(row, x0, x1):
    seg = row[x0:x1]
    return (np.abs(seg - 27) > 4).mean() > 0.85

def erase(f):
    g = gray(f)
    score, ly, lx = find_label(g)
    if score < 0.6:
        return f
    lx0 = lx - 30 + 30   # template x origin matches label column offset
    # box sides: nearest vertical border left/right of the label row
    row = g[ly + 12]
    left = next((x for x in range(lx0, PX0 + 2, -1) if abs(row[x] - 27) > 5), None)
    right = next((x for x in range(lx0 + 100, PX1 - 2) if abs(row[x] - 27) > 5), None)
    if left is None or right is None:
        return f
    # box top: the topmost border line above the label
    top = ly
    for y in range(ly, max(ly - 70, PY0), -1):
        if is_line(g[y], left + 8, right - 8):
            top = y
    # what the box stacks behind: the next full-width border below the label
    below = next((y for y in range(ly + 24, min(ly + 140, PY1)) if is_line(g[y], left + 12, right - 12)), None)
    out = f.copy()
    if below is None:
        return f
    out[top - 3:below - 2, left - 2:right + 3] = BG
    # box side borders and bottom continue behind the card
    bottom = below
    for y in range(below, PY1):
        if abs(g[y, left] - 27) > 4 or abs(g[y, left + 1] - 27) > 4:
            bottom = y
        elif y - bottom > 6:
            break
    out[below - 3:bottom + 4, left - 2:left + 4] = BG
    out[below - 3:bottom + 4, right - 3:right + 3] = BG
    if is_line(g[bottom], left + 12, right - 12) or is_line(g[bottom - 1], left + 12, right - 12):
        out[bottom - 3:bottom + 4, left - 2:right + 3] = BG
    return out

if __name__ == '__main__':
    SRC, OUT = sys.argv[1], sys.argv[2]
    W, H = ls.probe_size(SRC)
    still = SRC.endswith(('.png', '.jpg'))
    dec = ls.decoder(SRC)
    enc = ls.encoder(OUT, W, H, still)
    for f in ls.frames_of(dec, W, H):
        enc.stdin.write(np.ascontiguousarray(erase(f)).tobytes())
    enc.stdin.close(); enc.wait()
