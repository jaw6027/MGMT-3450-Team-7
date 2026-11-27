"""Refresh the editable prototype inside its already-exported standalone shell."""
from html import escape, unescape
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
source = (root / 'prototype.fragment.html').read_text(encoding='utf-8').strip()
page = root / 'index.html'
document = page.read_text(encoding='utf-8')
match = re.search(r'(<iframe\b[^>]*\bdata-srcdoc=")([^"]*)(")', document)
if not match:
    raise SystemExit('Standalone preview iframe not found; refusing to change the export.')
frame = unescape(match[2])
start, end = '<!--__CSTC_FRAGMENT_START__-->', '<!--__CSTC_FRAGMENT_END__-->'
if source.count(start) != 1 or source.count(end) != 1 or frame.count(start) != 1 or frame.count(end) != 1:
    raise SystemExit('Expected exactly one source fragment; refusing an ambiguous replacement.')
old_start, old_end = frame.index(start), frame.index(end) + len(end)
updated = frame[:old_start] + source + frame[old_end:]
rendered = document[:match.start(2)] + escape(updated, quote=True) + document[match.end(2):]
if '--check' in sys.argv:
    if rendered != document:
        raise SystemExit('Export is out of date. Run python3 scripts/build.py.')
    print('Standalone export matches the editable prototype.')
else:
    page.write_text(rendered, encoding='utf-8')
    print('Updated index.html from prototype.fragment.html.')
