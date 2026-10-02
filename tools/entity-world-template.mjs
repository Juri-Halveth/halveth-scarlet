export function entityWorldBody({ cards, languageButtons, count }) {
  const bi = (de, en) => `<span data-lang="de">${de}</span><span data-lang="en">${en}</span>`;
  const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  return `<body class="entity-world-page">
<a class="world-skip" href="#world-main">${bi('Zum Figurenraum','Skip to characters')}</a>
<header class="world-header">
  <a class="world-brand" href="../">${icon('orbit')}<span>HALVETH<small>${bi('DIE KONSTELLATION','THE CONSTELLATION')}</small></span></a>
  <div class="world-modes" role="group" aria-label="Ansicht" data-en-aria-label="View">
    <button type="button" id="mode-focus" aria-pressed="true">${icon('focus')}${bi('Folgen','Follow')}</button>
    <button type="button" id="mode-all" aria-pressed="false">${icon('compass')}${bi('Erkunden','Explore')}</button>
    <button type="button" id="mode-overview" aria-pressed="false" title="Alle Figuren im Raum" data-en-title="All characters in the world">${icon('users')}<span>${count}</span></button>
  </div>
  <div class="world-header-actions">
    <button class="icon-button" id="world-search-open" type="button" title="Figur suchen" data-en-title="Find character" aria-label="Figur suchen" data-en-aria-label="Find character">${icon('search')}</button>
    <button class="icon-button" id="entity-info-toggle" type="button" title="Profil anzeigen" data-en-title="Show profile" aria-label="Profil anzeigen" data-en-aria-label="Show profile" aria-expanded="false" aria-controls="entity-inspector">${icon('book-open')}</button>
    <button class="icon-button" id="world-pause" type="button" title="Bewegung pausieren" data-en-title="Pause motion" aria-label="Bewegung pausieren" data-en-aria-label="Pause motion" aria-pressed="false">${icon('pause')}</button>
    ${languageButtons}
  </div>
</header>
<main id="world-main" class="world-main">
  <section class="world-stage" aria-label="Figurenraum" data-en-aria-label="Character world">
    <div id="world-canvas" class="world-canvas"></div>
    <div class="world-heading"><p>HALVETH / LUCINET</p><h1>${bi('Raum für alle.','Room for everyone.')}</h1><span>${count} ${bi('Figuren','characters')} <span aria-hidden="true">/</span> <output id="world-clock" aria-label="Szenenzeit" data-en-aria-label="Scene time">00:00</output></span><label class="world-destination">${icon('map-pin')}<select id="world-destination" aria-label="Ort besuchen" data-en-aria-label="Visit place"><option value="commons">Konstellation</option><option value="garden">Glasgarten</option><option value="arcades">Echohallen</option><option value="beyond">Weiter draußen</option></select></label></div>
    <div id="world-loading" class="world-loading" role="status">${bi('Figuren entstehen …','Characters taking shape …')}</div>
    <div id="world-error" class="world-error" role="alert" hidden><p>${bi('3D ist gerade nicht verfügbar. Die Profile bleiben erreichbar.','3D is unavailable. The profiles remain accessible.')}</p><button type="button" id="world-retry">${bi('Erneut laden','Retry')}</button><button type="button" id="world-fallback">${bi('Profile öffnen','Open profiles')}</button></div>
    <div class="world-camera-controls" role="group" aria-label="Kamera" data-en-aria-label="Camera">
      <button class="icon-button" id="camera-left" title="Nach links drehen" data-en-title="Rotate left" aria-label="Nach links drehen" data-en-aria-label="Rotate left">${icon('rotate-ccw')}</button>
      <button class="icon-button" id="camera-right" title="Nach rechts drehen" data-en-title="Rotate right" aria-label="Nach rechts drehen" data-en-aria-label="Rotate right">${icon('rotate-cw')}</button>
      <button class="icon-button" id="camera-in" title="Näher" data-en-title="Zoom in" aria-label="Näher" data-en-aria-label="Zoom in">${icon('plus')}</button>
      <button class="icon-button" id="camera-out" title="Weiter" data-en-title="Zoom out" aria-label="Weiter" data-en-aria-label="Zoom out">${icon('minus')}</button>
      <button class="icon-button" id="camera-reset" title="Kamera zurücksetzen" data-en-title="Reset camera" aria-label="Kamera zurücksetzen" data-en-aria-label="Reset camera">${icon('scan')}</button>
    </div>
    <div class="world-movement" role="group" aria-label="Bewegen" data-en-aria-label="Move">
      <button class="icon-button" id="move-forward" title="Vorwärts (W)" data-en-title="Forward (W)" aria-label="Vorwärts" data-en-aria-label="Forward">${icon('arrow-up')}</button>
      <button class="icon-button" id="move-left" title="Nach links (A)" data-en-title="Left (A)" aria-label="Nach links" data-en-aria-label="Left">${icon('arrow-left')}</button>
      <button class="icon-button" id="move-back" title="Rückwärts (S)" data-en-title="Backward (S)" aria-label="Rückwärts" data-en-aria-label="Backward">${icon('arrow-down')}</button>
      <button class="icon-button" id="move-right" title="Nach rechts (D)" data-en-title="Right (D)" aria-label="Nach rechts" data-en-aria-label="Right">${icon('arrow-right')}</button>
      <button class="icon-button" id="move-up" title="Aufsteigen (E)" data-en-title="Ascend (E)" aria-label="Aufsteigen" data-en-aria-label="Ascend">${icon('chevrons-up')}</button>
      <button class="icon-button" id="move-down" title="Absteigen (Q)" data-en-title="Descend (Q)" aria-label="Absteigen" data-en-aria-label="Descend">${icon('chevrons-down')}</button>
    </div>
    <aside id="entity-inspector" class="world-inspector" aria-labelledby="entity-name" hidden>
      <div class="entity-meta"><span id="entity-number"></span><button class="icon-button" id="entity-info-close" type="button" title="Profil schließen" data-en-title="Close profile" aria-label="Profil schließen" data-en-aria-label="Close profile">${icon('x')}</button></div>
      <h2 id="entity-name">SCARLET</h2>
      <p id="entity-role"></p>
      <p id="entity-kind" class="entity-kind"></p>
      <div class="entity-links"><a id="entity-profile" href="scarlet/">${icon('book-open')}${bi('Geschichte & Quellen','Story & sources')}${icon('arrow-up-right')}</a></div>
      <details class="entity-details"><summary>${bi('Herkunft & Anbindung','Origin & connection')}</summary><p id="entity-source"></p><p id="entity-note"></p><dl><dt>${bi('Darstellung','Representation')}</dt><dd>${bi('Animierte 3D-Figur','Animated 3D character')}</dd><dt>API / ${bi('Aufträge','Jobs')}</dt><dd>${bi('Nicht verbunden','Not connected')}</dd></dl></details>
      <div class="entity-neighbors"><h3>${bi('Im selben Bereich','In the same area')}</h3><div id="entity-neighbors"></div></div>
    </aside>
  </section>
  <section class="world-bottom" aria-label="Navigation und Zeit" data-en-aria-label="Navigation and time">
    <div class="world-selection">
      <button class="icon-button" id="entity-prev" aria-label="Vorige Figur" data-en-aria-label="Previous character" title="Vorige Figur" data-en-title="Previous character">${icon('chevron-left')}</button>
      <div class="selection-copy"><small>${bi('IM FOKUS','IN FOCUS')}</small><strong id="selection-name">SCARLET</strong></div>
      <button class="icon-button" id="entity-next" aria-label="Nächste Figur" data-en-aria-label="Next character" title="Nächste Figur" data-en-title="Next character">${icon('chevron-right')}</button>
    </div>
    <div class="world-time-controls">
      <button id="moment-save" class="moment-save" type="button">${icon('bookmark-plus')}${bi('Moment merken','Keep moment')}</button>
      <button id="time-toggle" type="button" aria-expanded="false" aria-controls="world-timeline">${icon('history')}${bi('Zeitspur','Timeline')} <span id="moment-count">0</span></button>
      <button id="studio-toggle" type="button" aria-expanded="false" aria-controls="world-studio">${icon('radio')}Studio</button>
    </div>
    <a class="world-reading" href="#profile-directory" id="directory-open">${bi('Verzeichnis','Directory')}${icon('list')}</a>
    <div id="world-timeline" class="world-timeline" hidden>
      <div class="scene-time-controls"><button class="icon-button" id="scene-back" title="Szenenzeit 30 Sekunden zurück" data-en-title="Scene time back 30 seconds" aria-label="Szenenzeit zurück" data-en-aria-label="Rewind scene">${icon('rewind')}</button><label for="scene-speed">${bi('Weltlauf','World pace')}</label><select id="scene-speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select><button class="icon-button" id="scene-forward" title="Szenenzeit 30 Sekunden vor" data-en-title="Scene time forward 30 seconds" aria-label="Szenenzeit vor" data-en-aria-label="Advance scene">${icon('fast-forward')}</button></div>
      <label for="moment-slider">${bi('Gemerkte Momente auf diesem Gerät','Kept moments on this device')}</label>
      <input id="moment-slider" type="range" min="0" max="0" value="0" step="1" disabled>
      <output id="moment-time" for="moment-slider"></output>
      <button class="icon-button" id="moment-export" title="Zeitspur exportieren" data-en-title="Export timeline" aria-label="Zeitspur exportieren" data-en-aria-label="Export timeline" disabled>${icon('download')}</button>
    </div>
    <p id="world-status" class="world-status" role="status" aria-live="polite"></p>
  </section>
</main>
<aside id="world-studio" class="world-studio" aria-labelledby="studio-title" hidden>
  <header><div><small id="studio-mode">${bi('GERÄTE-VORSCHAU','DEVICE PREVIEW')}</small><h2 id="studio-title">${bi('Weltstudio','World studio')}</h2></div><button id="studio-close" class="icon-button" title="Studio schließen" data-en-title="Close studio" aria-label="Studio schließen" data-en-aria-label="Close studio">${icon('x')}</button></header>
  <div class="studio-toolbar"><button id="studio-stage" title="Bühnenansicht" data-en-title="Stage view">${icon('scan')}${bi('Bühne','Stage')}</button><button id="studio-export" title="Sitzung exportieren" data-en-title="Export session" aria-label="Sitzung exportieren" data-en-aria-label="Export session">${icon('download')}</button><button id="studio-relay" hidden>${icon('radio')}${bi('Lokalen Raum verbinden','Connect local room')}</button></div>
  <label for="studio-name">${bi('Anzeigename','Display name')}</label><input id="studio-name" maxlength="32" value="Gast" autocomplete="off">
  <div class="studio-tabs" role="tablist" aria-label="Studio"><button id="studio-tab-impulse" role="tab" aria-selected="true" aria-controls="studio-impulse">${bi('Impulse','Impulses')}</button><button id="studio-tab-chat" role="tab" aria-selected="false" aria-controls="studio-chat">Chat</button><button id="studio-tab-support" role="tab" aria-selected="false" aria-controls="studio-support">Wallet</button></div>
  <section id="studio-impulse" role="tabpanel" aria-labelledby="studio-tab-impulse">
    <label for="studio-item">${bi('Gegenstand','Object')}</label><select id="studio-item"><option value="chocolate">Schokoladentafel</option><option value="book">Geschichtenbuch</option><option value="beacon">Leuchtzeichen</option></select>
    <div class="studio-value"><strong id="studio-value">3,00 €</strong><span>${bi('Beispielwert · keine Zahlung','Example value · no payment')}</span></div>
    <div class="studio-create-actions"><button id="studio-create" class="studio-primary">${icon('gift')}${bi('Kostenlos erscheinen lassen','Create for free')}</button><button id="studio-repeat" class="icon-button" title="Letzten Impuls wiederholen" data-en-title="Repeat last impulse" aria-label="Letzten Impuls wiederholen" data-en-aria-label="Repeat last impulse" disabled>${icon('copy')}</button></div>
    <ol id="studio-events" class="studio-feed" aria-label="Gegenstandsereignisse" data-en-aria-label="Object events"></ol>
  </section>
  <section id="studio-chat" role="tabpanel" aria-labelledby="studio-tab-chat" hidden>
    <p id="studio-chat-scope" class="studio-caption">${bi('Vorschau auf diesem Gerät','Preview on this device')}</p>
    <ol id="studio-messages" class="studio-feed" aria-label="Chat" aria-live="polite" aria-relevant="additions"></ol>
    <form id="studio-chat-form"><label for="studio-message">${bi('Nachricht','Message')}</label><div class="studio-compose"><input id="studio-message" maxlength="280" required autocomplete="off"><button class="icon-button" type="submit" title="Nachricht senden" data-en-title="Send message" aria-label="Nachricht senden" data-en-aria-label="Send message">${icon('send')}</button></div></form>
  </section>
  <section id="studio-support" role="tabpanel" aria-labelledby="studio-tab-support" hidden>
    <p class="studio-caption">${bi('Vorgesehener Empfänger','Intended recipient')}</p><code id="studio-recipient"></code>
    <button id="studio-copy">${icon('copy')}${bi('Adresse kopieren','Copy address')}</button>
    <p class="studio-caption">${bi('Chain / Token offen · Zahlungen inaktiv','Chain / token pending · payments inactive')}</p>
    <details id="studio-wallet-details"><summary>${bi('Eigene Wallet','Your wallet')}</summary>
      <select id="studio-wallet-provider" aria-label="Wallet-Anbieter" data-en-aria-label="Wallet provider"></select>
      <button id="studio-wallet-connect">${icon('wallet')}${bi('Wallet verbinden','Connect wallet')}</button><button id="studio-wallet-disconnect" hidden>${bi('Trennen','Disconnect')}</button>
      <p id="studio-wallet-state" class="studio-caption"></p><code id="studio-wallet-account"></code>
    </details>
  </section>
  <p id="studio-status" class="studio-caption" role="status"></p>
</aside>
<button id="studio-stage-exit" class="studio-stage-exit" hidden>${icon('scan')}${bi('Bühne verlassen','Leave stage')}</button>
<output id="studio-toast" class="studio-toast" hidden></output>
<dialog id="world-search" class="world-search" aria-labelledby="search-title">
  <header><h2 id="search-title">${bi('Wen besuchen wir?','Who shall we visit?')}</h2><button class="icon-button" type="button" id="world-search-close" aria-label="Schließen" data-en-aria-label="Close">${icon('x')}</button></header>
  <label for="entity-search">${bi('Name oder Rolle','Name or role')}</label><input type="search" id="entity-search" autocomplete="off">
  <p id="entity-search-count" role="status" aria-live="polite"></p><div id="entity-search-results"></div>
</dialog>
<section id="profile-directory" class="profile-main world-directory"><h2>${bi('Alle Profile','All profiles')}</h2>
  <label for="profile-search">${bi('Name, Rolle oder Thema','Name, role or subject')}</label><input id="profile-search" type="search" autocomplete="off"><p id="profile-results" role="status" aria-live="polite"></p><ul class="profile-grid">${cards}</ul>
</section>
<noscript><p class="world-noscript">${bi('Die 69 Profile stehen im Verzeichnis. Für den 3D-Raum wird JavaScript benötigt.','The 69 profiles are available in the directory. The 3D world requires JavaScript.')}</p></noscript>
<script src="../assets/universe-data.js"></script><script src="../assets/entity-profile.js" defer></script><script src="../assets/entity-world-loader.js" defer></script><script src="../assets/wallet-connection.js" defer></script><script type="module" src="../assets/entity-world-studio.mjs"></script>
</body></html>\n`;
}
