"""Rebuild a light laptop-mockup frame: light mockup outside the screen, Studio light tokens on the
screen chrome, and the untouched 3D viewport.  usage: LIGHT DARK OUT [start count]"""
import sys
import numpy as np
from scipy import ndimage as ndi
sys.path.insert(0, __import__('os').path.dirname(__file__))
import lighten_studio as ls

def screen_mask(g):
    h, w = g.shape
    lab, _ = ndi.label(g > 8)
    c = lab[h // 2, w // 2]
    if c == 0:
        return np.zeros_like(g, bool)
    return ndi.binary_fill_holes(lab == c)

def viewport_rect(g, sat, screen):
    cand = ((g > 38) | (sat > 35)) & screen
    cand = ndi.binary_opening(cand, np.ones((9, 9), bool))
    lab, n = ndi.label(cand)
    if n == 0:
        return None
    sizes = ndi.sum(cand, lab, range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    if sizes[k - 1] < 0.12 * g.size:
        return None
    sl = ndi.find_objects(lab == k)[0]
    return sl[1].start, sl[0].start, sl[1].stop, sl[0].stop

def compose(L, D):
    Df = D.astype(np.float32)
    g = Df.mean(axis=2)
    sat = Df.max(axis=2) - Df.min(axis=2)
    scr = screen_mask(g)
    ls.KEEP_RECT = viewport_rect(g, sat, scr)
    ls.GENERIC = True
    conv = ls.convert(D)
    return np.where(scr[:, :, None], conv, L)

if __name__ == '__main__':
    LIGHT, DARK, OUT = sys.argv[1:4]
    W, H = ls.probe_size(DARK)
    if LIGHT.endswith('.jpg'):
        L = next(ls.frames_of(ls.decoder(LIGHT), W, H))
        D = next(ls.frames_of(ls.decoder(DARK), W, H))
        enc = ls.encoder(OUT, W, H, still=True)
        enc.stdin.write(compose(L, D).tobytes())
    else:
        start, count = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (0, 10 ** 9)
        dl, dd = ls.decoder(LIGHT), ls.decoder(DARK)
        enc = ls.encoder(OUT, W, H)
        for i, (L, D) in enumerate(zip(ls.frames_of(dl, W, H), ls.frames_of(dd, W, H))):
            if i < start:
                continue
            if i >= start + count:
                break
            enc.stdin.write(compose(L, D).tobytes())
        dl.kill(); dd.kill()
    enc.stdin.close()
    enc.wait()
