# HALVETH Quellen-News

Diese Seite zeigt einen **stündlich aktualisierten Quellenstand**, keine garantierte Echtzeitverbindung. Artikelüberschriften bleiben im englischen Original. Die Oberfläche ist auf Deutsch und Englisch verfügbar. Veröffentlicht werden Überschrift, Quellenlink und Zeitangaben; vollständige Artikel oder erfundene Zusammenfassungen werden nicht übernommen.

## Quellen und Daten

Am 16.09.2026 wurden beide exakten Feed-Adressen per HTTPS mit HTTP 200 und `application/rss+xml` geprüft:

- NASA: <https://www.nasa.gov/news-release/feed/>
- GitHub Changelog: <https://github.blog/changelog/feed/>

`../assets/news-data.json` ist die öffentliche Schnittstelle (`schemaVersion: 1`). Sie enthält `generatedAt`, `staleAfterMinutes`, `sources` und `items`. Jede Quelle führt Feedadresse, letzten Versuch, letzten Erfolg und Abrufstatus. Jede Meldung führt eine aus der Artikel-URL gebildete ID, Herausgeber, Originaltitel, Titel-Sprache, URL, `sourcePublishedAt`, `fetchedAt` und `firstFetchedAt`. Ein Abruf beweist keine Aktualität des Artikels; die Zeitachsen bleiben getrennt.

Es werden nur die zwei fest hinterlegten Feeds und deren explizit erlaubte Artikelhosts verarbeitet. Abrufe haben 20 Sekunden Timeout und 1 MiB Größenlimit. DTDs und Entities werden abgelehnt. Je Quelle bleiben höchstens 30 Meldungen im Snapshot. Bei einem Feedfehler bleibt dessen letzter guter Inhalt erhalten. Nach drei Stunden ohne erfolgreichen Abruf zeigt die Oberfläche den Stand als verzögert. Fehlertexte enthalten keine rohen Serverantworten oder lokalen Pfade.

## Tagesentwurf und Adapter

Der Lauf um Minute 17 prüft die Berliner Ortszeit. **Ab 18:17 Europe/Berlin** entsteht höchstens ein deutscher Entwurf pro Kalendertag, mit maximal fünf bisher nicht in früheren Entwürfen enthaltenen Meldungen der letzten sieben Tage. Nur aktuell erfolgreich abgerufene Quellen sind zulässig. Es gibt keine Nachdatierung und keinen erfundenen Nachhol-Lauf. GitHub Actions kann planmäßige Starts verzögern.

Zielangabe ist **u/Halveth**. Der einzige mitgelieferte Adapter ist `draft`: Er schreibt `drafts/YYYY-MM-DD.json`, `.md`, den Entwurfsindex und `receipts/YYYY-MM-DD.json`. `DRAFT_ONLY` bedeutet **nicht auf Reddit veröffentlicht**. Es sind keine Reddit-Zugangsdaten, kein Reddit-Netzwerkclient und keine Konto-, Gruppen-, Kommentar- oder Posting-Automatik enthalten.

Die getrennte Adapter-Schnittstelle verlangt `id` und `publish({digest, idempotencyKey})`. Erfolgreiche reale Adapter müssten eine stabile `postId` liefern. Nach unterbrochenem oder unklarem Ausgang ist vor Wiederholung `findByKey(idempotencyKey)` Pflicht: vorhandene Post-ID bedeutet bereits erfolgt; `null` bedeutet durch den Adapter eindeutig ausgeschlossen; jeder andere Ausgang stoppt. Ein Fehler darf nur mit `retrySafe=true` als sicher vor Außenwirkung fehlgeschlagen gelten. Dauerhafte Receipts und exklusive Lock-Dateien verhindern beiläufige Doppelzustellungen. Eine nach einem Prozessabbruch verbliebene `.lock` wird nicht automatisch entfernt; der Betreiber muss den Prozesszustand prüfen und vor dem nächsten Versuch die passende Receipt prüfen. Ein Wechsel vom Draft-Adapter zu einem anderen Adapter ist gesperrt und erfordert einen separat geprüften Veröffentlichungsauftrag.

Diese Schnittstelle ist ein Testvertrag, keine Reddit-Freigabe. Tatsächliche Veröffentlichung benötigt zulässigen Plattformzugang und die konkrete Zielberechtigung. Maßgeblich: [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy), [Spam-Regeln](https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam), [Devvit Scheduler](https://developers.reddit.com/docs/capabilities/server/scheduler).

## Betrieb und lokale Prüfung

Voraussetzungen: Python 3.11+ und Node.js 22+, keine kostenpflichtigen Anbieter oder zusätzlichen Pakete.

```sh
python tools/news-refresh.py
node tools/news-digest.cjs
node --test tests/news-pipeline.test.cjs
```

`news-refresh.py --output <Datei>` unterstützt einen getrennten lokalen Prüfstand. Fixtures werden ausschließlich in Tests als injizierter Fetcher verwendet, nie automatisch als Live-Nachrichten übernommen. Die Node-Tests verwenden temporäre Verzeichnisse und Fake-Publisher für Erfolg, sicheren Fehler, unklaren Ausgang und Wiederholung; es gibt dabei keine Reddit-Verbindung.

Der Workflow führt einen begrenzten Lauf stündlich um Minute 17 sowie manuell aus. Er schreibt nur Snapshot, Tagesentwürfe und Receipts, prüft sie vor einem Commit und ruft anschließend den wiederverwendbaren Pages-Workflow auf. Ein GitHub-Token-Commit allein löst keinen zweiten Push-Workflow aus; die explizite Übergabe verhindert einen nicht veröffentlichten Datenstand. Workflow-Status und letzter erfolgreicher Feedabruf sind getrennte Betriebsindikatoren.

## English overview

Official NASA and GitHub RSS feeds are fetched hourly into a static, timestamped last-good snapshot. The page has German and English UI; headlines remain in their original English. Failed sources preserve their previous items and display a visible freshness warning.

After 18:17 Berlin time, the pipeline prepares at most one German draft per day with up to five unseen recent items. The target is u/Halveth, but **no active Reddit publisher ships**. Draft files and durable receipts are public review artifacts, not proof of a Reddit post. A future approved adapter must reconcile ambiguous attempts before retrying; the tests demonstrate this contract only with fake publishers.
