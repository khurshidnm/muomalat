"""
Build the "Muomalat Okina Sans" patch font.

IBM Plex Sans draws U+02BB (ʻ, oʻ/gʻ) and U+02BC (ʼ, tutuq belgisi) as
600-unit spacing modifiers with ~250-unit sidebearings, so Uzbek words fall
apart ("O ʻ zbekiston"). This script maps both code points onto Plex's own
quoteleft/quoteright outlines with word-internal spacing and keeps only those
two glyphs. Served with `unicode-range: U+02BB-02BC` ahead of Plex in the font
stack. Renamed because "Plex" is a Reserved Font Name under the OFL.

usage: python fix-okina.py <in.woff2|ttf> <out> [--subset] [--family NAME --style STYLE]
  --subset  keep only the two glyphs (web patch font); without it, patch the
            full font in place (used for the OG-image TTFs).
  --family / --style  rename a full-font output, e.g. --family "Muomalat Card Sans"
            --style Medium. Subsets are modified versions under the OFL and may not
            keep the Reserved Font Names "Plex" or "Source".
"""
import sys
from fontTools.ttLib import TTFont
from fontTools import subset

src, out = sys.argv[1], sys.argv[2]
only = '--subset' in sys.argv


def arg(flag):
    return sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else None


rename = (arg('--family'), arg('--style'))

f = TTFont(src)
for table in f['cmap'].tables:
    if table.isUnicode():
        table.cmap[0x02BB] = 'quoteleft'
        table.cmap[0x02BC] = 'quoteright'

if only:
    opts = subset.Options()
    opts.layout_features = []
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.notdef_outline = True
    opts.glyph_names = False
    opts.flavor = 'woff2' if out.endswith('.woff2') else None
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=[0x02BB, 0x02BC])
    sub.subset(f)

glyf = f['glyf']
hmtx = f['hmtx']
# Target: ~40 units outside, ~28 inside, close to Source Serif's ʻ (212/1000).
targets = {'quoteleft': (40, 28), 'quoteright': (28, 40)}
for name, (lsb_t, rsb_t) in targets.items():
    if name not in glyf.glyphs:
        continue
    g = glyf[name]
    g.recalcBounds(glyf)
    width = g.xMax - g.xMin
    dx = lsb_t - g.xMin
    if g.isComposite():
        for c in g.components:
            c.x += dx
    else:
        coords = g.coordinates
        coords.translate((dx, 0))
    g.recalcBounds(glyf)
    hmtx[name] = (int(width + lsb_t + rsb_t), g.xMin)

if only:
    family = 'Muomalat Okina Sans'
    for rec in f['name'].names:
        if rec.nameID in (1, 16):
            rec.string = family
        elif rec.nameID == 4:
            rec.string = family
        elif rec.nameID == 6:
            rec.string = 'MuomalatOkinaSans'
        elif rec.nameID == 3:
            rec.string = 'MuomalatOkinaSans-patch'
    f['name'].setName('Derived from IBM Plex Sans (SIL OFL 1.1). Modified U+02BB/U+02BC spacing for Uzbek.', 10, 3, 1, 0x409)

if rename[0]:
    family, style = rename[0], rename[1] or 'Regular'
    ps = family.replace(' ', '') + '-' + style.replace(' ', '')
    full = f'{family} {style}'
    name = f['name']
    for nid in (1, 2, 3, 4, 6, 13, 14, 16, 17):
        name.removeNames(nameID=nid)
    ofl = 'https://openfontlicense.org'
    for pid, eid, lid in ((3, 1, 0x409), (1, 0, 0)):
        for nid, value in ((1, full), (2, 'Regular'), (3, f'{ps};subset'), (4, full), (6, ps), (16, family), (17, style),
                           (13, f'This Font Software is licensed under the SIL Open Font License, Version 1.1. This license is available with a FAQ at: {ofl}'),
                           (14, ofl)):
            name.setName(value, nid, pid, eid, lid)

f.save(out)
print('wrote', out)
