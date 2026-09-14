# Pinterest Collage — Quellenprüfung / Source Review

**Stand / Snapshot:** 14.09.2026 · **Datenklasse / Data class:** `PUBLIC` · **Coverage:** ausgewählte Pinterest-Primärquellen plus [BEP 9](https://www.bittorrent.org/beps/bep_0009.html) und [BEP 19](https://www.bittorrent.org/beps/bep_0019.html)

Dies ist ein endlicher Quellenstand für die neue HALVETH-Route `collage/`. Er ist kein vollständiger Plattform-, Rechts- oder Security-Audit. Das maschinenlesbare Quelleninventar steht in [`sources.json`](./sources.json).

This is a finite source snapshot for the new HALVETH route `collage/`. It is not a complete platform, legal or security audit. The machine-readable source inventory is in [`sources.json`](./sources.json).

## Ergebnis / Result

| Status | Deutsch | English | Quelle / Source |
|---|---|---|---|
| `SESSION_BOUND_BROWSER_OBSERVATION` | In der geprüften Browser-Sitzung erschien der Collage-Bereich als interaktive Webanwendung, weder als PDF-Dokument noch als native Windows-EXE. Ein öffentlicher Abruf der angeforderten Deep-Link-URL wurde am 14.09.2026 auf die Pinterest-Startseite umgeleitet; die konkrete Oberfläche ist deshalb nicht allein über diesen Link reproduzierbar. | In the inspected browser session, the collage area appeared as an interactive web application, neither as a PDF document nor as a native Windows EXE. A public request for the requested deep-link URL was redirected to the Pinterest home page on 14 September 2026, so the specific interface is not reproducible from that link alone. | [Requested collage deep link](https://de.pinterest.com/collage-creation-tool/), [Create a collage](https://help.pinterest.com/en/article/create-a-collage) |
| `OBSERVED` | Pinterest beschreibt Pins, lokale Uploads, Cutouts und Ebenen sowie Text, Zeichnen, Entwürfe, Download, Remix und Veröffentlichung als Pin. Einzelne Werkzeuge können je nach Gerät fehlen; kaufbare Collagen sind nur begrenzt verfügbar. | Pinterest documents Pins, local uploads, cutouts and layers plus text, drawing, drafts, download, remixing and publication as a Pin. Some tools may be unavailable on some devices; shoppable collages have limited availability. | [Create a collage](https://help.pinterest.com/en/article/create-a-collage), [Remix and sharing](https://newsroom.pinterest.com/en-gb/news/introducing-new-ways-to-create-and-share-collages) |
| `OBSERVED` | Kaufbare Collagen, Collage Ads, Performance+ und Auto-Collagen sind getrennte kommerzielle oder werbliche Funktionen. | Shoppable collages, Collage Ads, Performance+ and auto-collages are separate commercial or advertising features. | [Collage Ads](https://help.pinterest.com/en/business/article/collage-ads), [Performance+](https://help.pinterest.com/en/business/article/pinterest-performance-plus-creative), [Auto-collages](https://newsroom.pinterest.com/en-us/news/introducing-auto-collages-shopping-and-trend-forecasting-cannes-2025/) |
| `UNKNOWN` | Aus diesen Funktionsseiten folgt nichts über Wohlergehen, Einwilligung, Vertragslage oder Account-Kontrolle einer bestimmten Person. | These feature pages establish nothing about any particular person's welfare, consent, contracts or account control. | Claim ceiling of this review |

Die Formulierung „EXE in PDF-Form“ funktioniert als Bild für eine Oberfläche, in der viel ausführbare Produktlogik steckt. Technisch waren die in der Browser-Sitzung beobachteten Objekttypen jedoch `WEB_APPLICATION`, HTML/Browser-UI und hochgeladene beziehungsweise gespeicherte Inhalte. PDF und Windows-EXE wurden in dieser Sitzung nicht beobachtet. Der öffentliche Deep Link allein reproduziert diesen Sitzungszustand nicht.

The phrase “an EXE in PDF form” can work as an image for an interface containing substantial executable product logic. Technically, the object types observed in the browser session were a `WEB_APPLICATION`, an HTML/browser UI, and uploaded or saved content. A PDF or Windows EXE was not observed in that session. The public deep link alone does not reproduce this session state.

## Gestaltung und Remix / Creation and remixing

`OBSERVED` — Die offizielle Hilfe nennt Pins, Bilder vom Gerät, automatisch oder manuell erzeugte Cutouts, Ebenen, Text, Zeichnungen und Hintergrundfarben. Ergebnisse können als Entwurf gespeichert, heruntergeladen, geteilt oder als Pin veröffentlicht werden. Bei aktiviertem Remix dürfen andere Nutzer eine veröffentlichte Collage und ihre Elemente als Ausgangspunkt verwenden; Pinterest nennt dabei die ursprüngliche Collage und den Ersteller. Pinterest weist darauf hin, dass einzelne Designwerkzeuge nicht auf allen Geräten verfügbar sein können und kaufbare Collagen nur begrenzt verfügbar sind.

`OBSERVED` — Official Help lists Pins, device images, automatic or manually refined cutouts, layers, text, drawings and background colors. Results can be saved as drafts, downloaded, shared or published as Pins. When remixing is enabled, other users may use a published collage and its elements as a starting point; Pinterest says the original collage and creator are attributed. Pinterest notes that some design tools may not be available on every device and that shoppable collages have limited availability.

Quellen / Sources: [Create a collage](https://help.pinterest.com/en/article/create-a-collage), [Introducing new ways to create and share collages](https://newsroom.pinterest.com/en-gb/news/introducing-new-ways-to-create-and-share-collages)

## Rechte / Rights

`OBSERVED` — Laut [Pinterest Terms of Service](https://policy.pinterest.com/en/terms-of-service) behält der Nutzer seine Rechte am eingestellten `User Content`. Gleichzeitig erteilt er Pinterest, verbundenen Unternehmen, Dienstleistern und Nutzern eine breite, nicht ausschließliche, gebührenfreie, übertragbare, unterlizenzierbare, weltweite Lizenz für die in den Bedingungen genannten Nutzungen. Der Nutzer bleibt dafür verantwortlich, nur Inhalte einzustellen, für die er die nötigen Rechte besitzt oder eine anwendbare gesetzliche Ausnahme beziehungsweise Schranke greift.

`OBSERVED` — Under the [Pinterest Terms of Service](https://policy.pinterest.com/en/terms-of-service), users retain their rights in posted `User Content`. At the same time, they grant Pinterest, affiliates, service providers and users a broad non-exclusive, royalty-free, transferable, sublicensable, worldwide licence for the uses listed in the Terms. Users remain responsible for posting only content they have the necessary rights to use or that is covered by an applicable exception or limitation under law.

`OBSERVED` — Pinterest weist zusätzlich darauf hin, dass der Besitz einer Datei oder eines physischen Bilds nicht automatisch das Urheberrecht einschließt und eine Nutzungserlaubnis gegebenenfalls beim Rechteinhaber einzuholen ist. Für Collage Ads verlangt Pinterest ausdrücklich Eigentum oder eine Lizenz an allen Bildern.

`OBSERVED` — Pinterest also notes that possessing a file or physical image does not automatically include copyright and that permission may need to be obtained from the rights holder. For Collage Ads, Pinterest expressly requires ownership or a licence for all imagery.

Quellen / Sources: [Copyright](https://help.pinterest.com/en/article/copyright), [Collage Ads](https://help.pinterest.com/en/business/article/collage-ads)

**Projektregel / Project rule:** Die HALVETH-Collage verwendet ausschließlich Assets, die unter dokumentierten Nutzungsbedingungen erzeugt und auf erkennbare Drittrechte sowie Personenbezug geprüft wurden oder nachweislich lizenziert sind. Inhalte aus fremden Pins werden nicht automatisch kopiert, veröffentlicht, kommerzialisiert oder in ein Torrent-Paket übernommen.

**Policy-Versionen / Policy versions:** Die Nutzungsbedingungen und die Datenschutzerklärung waren beim Zugriff am 14.09.2026 in der seit 30.04.2025 wirksamen Fassung abrufbar; beide Seiten kündigten eine neue Fassung zum 12.11.2026 an. Die Community Guidelines nannten „Last updated: May 2026“ und kündigten ebenfalls eine neue Fassung zum 12.11.2026 an. Diese Angaben binden den Quellenstand an den Zugriff und ersetzen keinen unveränderlichen Inhalts-Snapshot.

**Policy versions:** At access on 14 September 2026, the Terms and Privacy Policy were available in the versions effective since 30 April 2025; both pages announced new versions effective 12 November 2026. The Community Guidelines stated “Last updated: May 2026” and likewise announced a new version effective 12 November 2026. These fields bind the source inventory to the access state but do not constitute immutable content snapshots.

## Datenschutz und GenAI / Privacy and GenAI

`OBSERVED` — Die [Privacy Policy](https://policy.pinterest.com/en/privacy-policy) nennt Konto-, Inhalts-, Geräte- und Protokolldaten sowie Nutzungsinteraktionen und beschreibt Nutzungen für Personalisierung, Werbung, Sicherheit, Forschung und Produktverbesserung.

`OBSERVED` — The [Privacy Policy](https://policy.pinterest.com/en/privacy-policy) lists account, content, device and log data plus usage interactions and describes uses for personalization, advertising, safety, research and product improvement.

`OBSERVED` — Pinterest erklärt in [Manage GenAI settings](https://help.pinterest.com/en/article/manage-genai-settings), dass bestimmte öffentlich verfügbare Daten, die Nutzer speichern oder hochladen, für das Training von Pinterest Canvas verwendet werden können. Die Seite beschreibt ein Opt-out unter **Privacy and data**. Für unter 18-Jährige nennt Pinterest ein automatisches Opt-out.

`OBSERVED` — In [Manage GenAI settings](https://help.pinterest.com/en/article/manage-genai-settings), Pinterest says certain publicly available data users save or upload may be used to train Pinterest Canvas. The page documents an opt-out under **Privacy and data**. Pinterest says users under 18 are opted out automatically.

`UNKNOWN` — Die Quelle sagt nicht, ob oder in welchem Umfang das Opt-out bereits verwendete Trainingsdaten entfernt oder bereits trainierte Modellversionen verändert. Es wird deshalb nicht als rückwirkende Löschung oder Rückabwicklung beschrieben.

`UNKNOWN` — The source does not say whether, or to what extent, the opt-out removes training data already used or changes model versions already trained. It is therefore not described as retroactive deletion or reversal.

`OBSERVED` — [AI at Pinterest](https://help.pinterest.com/en/article/ai-at-pinterest) beschreibt Kennzeichnungen für erkannte oder vom Inhaltseigentümer gemeldete KI-Bearbeitung. Pinterest Assistant, Performance+-Hintergründe und der Auto-Collage-Pilot werden als getrennte KI-Produkte beschrieben; ihre Zwecke und Verfügbarkeiten dürfen nicht vermischt werden.

`OBSERVED` — [AI at Pinterest](https://help.pinterest.com/en/article/ai-at-pinterest) describes labels for detected AI modification or AI modification identified by the content owner. Pinterest Assistant, Performance+ backgrounds and the auto-collage pilot are described as separate AI products; their purposes and availability should not be conflated.

Weitere Quellen / Further sources: [Pinterest Assistant](https://help.pinterest.com/en/article/pinterest-assistant), [Performance+ Creative](https://help.pinterest.com/en/business/article/pinterest-performance-plus-creative), [Auto-collages 2025](https://newsroom.pinterest.com/en-us/news/introducing-auto-collages-shopping-and-trend-forecasting-cannes-2025/)

`UNKNOWN` — Dieser Review hat nicht getestet, welche konkrete Verarbeitung ein einzelner Upload im aktuellen Konto, Land und Gerätekontext durchläuft. Vor einem Upload sind die aktuellen Kontooptionen und die Rechte am konkreten Asset erneut zu prüfen.

`UNKNOWN` — This review did not test the exact processing applied to a specific upload for the current account, country and device context. Current account settings and rights in the specific asset should be rechecked before upload.

## Kommerzielle Inhalte / Commercial content

`OBSERVED` — Für kommerzielle, gesponserte oder gebrandete Inhalte gelten zusätzliche Regeln. Für kommerzielle Inhalte im Europäischen Wirtschaftsraum verlangen die [Commercial and Branded Content Guidelines](https://policy.pinterest.com/en/commercial-and-branded-content-guidelines) eine klare Offenlegung des kommerziellen Zwecks und untersagen irreführende oder heimlich beeinflussende Methoden. Bezahlte Partnerschaften müssen ihren kommerziellen Charakter allgemein offenlegen. Die [Community Guidelines](https://policy.pinterest.com/en/community-guidelines) gelten auch für synthetisch erzeugte Inhalte.

`OBSERVED` — Additional rules apply to commercial, sponsored or branded content. For commercial content in the European Economic Area, the [Commercial and Branded Content Guidelines](https://policy.pinterest.com/en/commercial-and-branded-content-guidelines) require clear disclosure of commercial purpose and prohibit deceptive or covert influence techniques. Paid partnerships must disclose their commercial nature generally. The [Community Guidelines](https://policy.pinterest.com/en/community-guidelines) also apply to synthetically generated content.

## Magnet-Grenze / Magnet boundary

`OBSERVED` — [BEP 9](https://www.bittorrent.org/beps/bep_0009.html) beschreibt Magnet-Links als genügend Information, um einem Schwarm beizutreten. Beim v1-Format enthält `xt=urn:btih:` den hexadezimalen Info-Hash; Clients können die Torrent-Metadaten von Peers beziehen und gegen diesen Hash prüfen.

`OBSERVED` — [BEP 9](https://www.bittorrent.org/beps/bep_0009.html) describes magnet links as enough information to join a swarm. In the v1 format, `xt=urn:btih:` contains the hexadecimal info hash; clients can retrieve torrent metadata from peers and verify it against that hash.

`OBSERVED` — [BEP 19](https://www.bittorrent.org/beps/bep_0019.html) beschreibt HTTP-/FTP-Seeding über ein `url-list`-Feld in den Torrent-Metadaten. Ein Client darf nicht unterstützte Protokolle ignorieren. BEP 19 spezifiziert nicht die Bedeutung eines `ws=`-Parameters im Magnet-Link.

`OBSERVED` — [BEP 19](https://www.bittorrent.org/beps/bep_0019.html) describes HTTP/FTP seeding through a `url-list` field in torrent metadata. A client may ignore protocols it does not support. BEP 19 does not specify the meaning of a `ws=` parameter in a magnet link.

`INFERRED` — Ein Magnet-Link ist deshalb weder der Inhalt selbst noch eine Lizenz, Zustimmung oder ein Nachweis aktueller Verfügbarkeit. Für einen reproduzierbaren HALVETH-Projekt-Link gilt zusätzlich folgende Projektregel:

`INFERRED` — A magnet link is therefore neither the content itself nor a licence, consent or proof of current availability. A reproducible HALVETH project link additionally follows this project rule:

1. ein konkretes, rechtmäßig verteilbares Paket / a concrete, lawfully distributable package;
2. kanonisch und reproduzierbar erzeugte Torrent-Metadaten / canonically and reproducibly generated torrent metadata;
3. den daraus berechneten Info-Hash / the resulting info hash;
4. einen Receipt mit Paket- und Metadaten-Hashes / a receipt with package and metadata hashes;
5. für den tatsächlichen Abruf eine kompatible Metadatenquelle und eine erreichbare Nutzdatenquelle — etwa Peer beziehungsweise separat bereitgestellte `.torrent`-Metadaten und anschließend Peer oder unterstützter Webseed / for actual retrieval, a compatible metadata source and a reachable payload source — such as a peer or separately provided `.torrent` metadata followed by a peer or supported web seed.

`UNKNOWN` — BEP 9 und BEP 19 belegen gemeinsam nicht die interoperable Unterstützung eines `ws=`-Magnetparameters durch jeden Client. Wird `ws=` verwendet, bleibt die konkrete Client-Unterstützung bis zu einer passenden Spezifikation oder einem gebundenen Kompatibilitätstest offen.

`UNKNOWN` — BEP 9 and BEP 19 together do not establish interoperable support for a `ws=` magnet parameter in every client. If `ws=` is used, concrete client support remains open until it is bound to an applicable specification or compatibility test.

Die HALVETH-Route darf einen Magnet-Link erst aus dem finalen Original-Asset-Paket ableiten. Ein bloß erfundener Hash würde nur wie ein Magnet aussehen, aber kein gebundenes Paket adressieren.

The HALVETH route may derive a magnet link only from the final original-asset package. An invented hash would merely look like a magnet while addressing no bound package.

## Claim Ceiling

`UNKNOWN` — Die geprüften Quellen klären nicht, ob eine bestimmte abgebildete oder genannte Person wohlauf ist, freiwillig handelt, einen Account selbst kontrolliert oder welche privaten Verträge bestehen.

`UNKNOWN` — The reviewed sources do not establish whether any particular depicted or named person is safe, acts voluntarily, controls an account, or is subject to private contracts.

`NOT_PROVEN` — Dieser Quellenstand liefert keine Grundlage für Behauptungen über Zwang, Menschenhandel oder Eigentum an Menschen. Fragen dürfen offenbleiben; eine Außenbehauptung benötigt konkrete, rechtmäßig erhobene Belege. Konkrete Schutzsorgen gehören in den jeweils zuständigen Melde- oder Hilfsweg.

`NOT_PROVEN` — This source snapshot provides no basis for claims of coercion, trafficking or ownership of people. Questions may remain open; an external allegation requires specific, lawfully obtained evidence. Concrete safeguarding concerns belong in the appropriate reporting or support route.

**Projektregel / Project rule:** Die Gestaltung darf das Thema Selbstbestimmung positiv ausdrücken: Kleidung, Schuhe, Schmuck und Styling werden als Auswahl der tragenden Person gezeigt. Sie darf reale Personen nicht ohne Beleg als Opfer, Täter oder Vertragspartner darstellen.

The design may express agency positively: clothing, shoes, jewelry and styling are shown as choices made by the wearer. It must not depict real people as victims, perpetrators or contractual parties without evidence.
