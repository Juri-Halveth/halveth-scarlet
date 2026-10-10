"""Verify the six published texture bytes against the source receipt."""
import hashlib
import json
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parent
receipt = json.loads((root / 'SCIENCE_ASSET_RECEIPT.json').read_text(encoding='utf-8'))
for layer in receipt['layers'].values():
    for prefix in ('display', 'preview'):
        path = root / 'assets' / layer[f'{prefix}_file']
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        assert digest == layer[f'{prefix}_sha256'], path.name
        with Image.open(path) as image:
            assert list(image.size) == layer[f'{prefix}_dimensions'], path.name
print('PASS: 6 published textures match their SHA-256 and dimensions')
