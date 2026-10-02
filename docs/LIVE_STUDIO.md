# Scarlet World Studio

## Public world

Open the existing `/entities/` world and its Studio button. A free test impulse
creates a chocolate bar, storybook or beacon. Example euro amounts are fixed
design values, not prices, exchange rates, quotes or received payments. These
are rendered digital objects, not physical matter or NFTs.

The GitHub Pages version provides a per-page preview chat and event session.
It does not share messages with other public visitors. The clean stage view
can be captured by streaming software; opening it does not start a livestream.

The intended support address is
`0x6416FDCfe74978Be4787A4e65E53090A7C9Eb5ca`.
It is user-supplied, not an ownership proof. Chain and token are unbound and
payments are inactive. The optional wallet button only requests the selected
account and chain ID after a click. It never signs or sends a transaction.

## Shared local studio

Requirements: existing Node.js 24 and PowerShell. No new account, service or
payment is required. From the repository run:

```powershell
.\START_STUDIO.ps1
```

Open `http://127.0.0.1:8842/entities/?lang=de&studio=relay#scarlet` in two
browser windows. Messages and test impulses are synchronized through one
loopback-only HTTP listener. Use `-Port 8843` when 8842 is occupied.
Ctrl+C stops the foreground server. A restart starts an empty session.

## PowerShell input

This creates exactly one free demo item in the connected local views:

```powershell
$Event = [ordered]@{
    schema = 'halveth.world-event.v1'
    id = [guid]::NewGuid().ToString()
    kind = 'GIFT_DEMO'
    createdAt = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    displayName = 'Studio'
    paymentState = 'NOT_A_PAYMENT'
    item = 'chocolate'
    exampleEuroCents = 300
}
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8842/api/studio/events' `
    -Headers @{ 'X-Scarlet-Studio' = '1' } -ContentType 'application/json' `
    -Body ([Text.Encoding]::UTF8.GetBytes(($Event | ConvertTo-Json)))
```

`GET /api/studio/status` reports the local instance and retained event count.
`GET /api/studio/stream` emits an initial SSE snapshot and subsequent events.
Only `CHAT` and `GIFT_DEMO` are accepted. Chat uses `text` (1..280 UTF-16 code
units), not `item` or `exampleEuroCents`. Display names are 1..32 code units.
Control characters, invalid Unicode, unknown fields and payment claims fail
validation. Host, Origin and browser fetch metadata are checked. POST requires
the named header and JSON. PowerShell is not subject to browser CORS.

The local API is a demo input, not an authenticated account, job executor,
payment oracle or trusted agent identity. Programs on the same computer may
submit demo events. Never forward this port to the Internet.

## Session and time

The relay retains 100 events in memory and supports up to 16 event streams.
Request bodies are limited to 4096 bytes; input is rate-limited to a burst of
30 and approximately one new token per second. Event IDs are deduplicated
within the retained journal window; a conflicting retained ID is rejected.
The scene displays the 24 newest gifts. Each renderer retains gift IDs for its
current lifetime to avoid rendering duplicates after eviction.

`createdAt` comes from the sender; `receivedAt` and `sequence` come from the
relay. Neither is a blockchain confirmation. Reconnected clients receive the
retained snapshot, not a guaranteed complete history. Different browser world
clocks are not synchronized: gift types and deterministic positions match,
but animation phases can differ. Rewinding the scene can hide objects before
their local appearance time; it does not undo events or external operations.

Session export is explicit and contains display names and chat text. There is
no automatic upload or chat file log. Reloading the public preview loses its
session. Existing character moments remain under their existing storage key.

## Next deployment edges

Real public multi-user chat needs a reachable server, identity/moderation,
abuse controls and a stated retention policy. Static GitHub Pages does not
provide that server. A future payment adapter must separately bind chain ID,
token contract, decimals, recipient, confirmation/reorg policy and unique
transaction/log identifiers. It must verify settlement before emitting a
different, verified event type. The present demo API cannot emit such events.
Connecting ports is not a cross-chain asset-transfer mechanism.

## Checks

```powershell
node tools/build_site.mjs
node --test tests/*.test.cjs tests/*.test.mjs
python -m unittest discover -s tests -p 'test_*.py'
```

Functional local checks are not an independent security audit, production
payment certification, ownership verification or proof of public chat hosting.
