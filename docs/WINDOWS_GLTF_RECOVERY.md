# Existing Windows checkouts: glTF line-ending recovery

Older worktrees may retain CRLF-converted glTF files after `.gitattributes`
changes. A fresh checkout can build while an old one fails its asset digest.
Changing the manifest to accept the converted bytes would hide that mismatch.

First inspect without changing files:

```sh
node tools/refresh_world_gltf.mjs
```

The helper checks only manifest-listed glTF assets. It compares each asset
with its exact committed bytes and the existing manifest digest. If the only
difference is CRLF conversion, it lists the pending paths. Files with semantic
local edits are rejected and preserved; review those edits separately.

To restore only that verified line-ending conversion:

```sh
node tools/refresh_world_gltf.mjs --repair
node tools/build_site.mjs
node tools/verify_build_info.mjs
```

The explicit repair preflights the complete glTF set before the first write.
It restores committed bytes rather than changing asset receipts. Keep the
worktree otherwise idle during recovery. This does not rebuild or accept an
Unreal runtime package.
