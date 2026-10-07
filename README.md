# ToDo-Manager

Eigene Aufgabenverwaltung als Web-App für GitHub Pages: Bereiche mit beliebig tiefen Unterbereichen, acht anpassbare Stati, Links, Netzwerkpfade und Vermerke an jedem Bereich und jeder Aufgabe. Läuft im Browser und als App auf dem Handy, auch offline. Optionaler Abgleich zwischen Geräten über Supabase.

Kein Server und kein Build-Schritt: Die Dateien kommen so, wie sie sind, ins Repo.

## Auf GitHub Pages veröffentlichen

1. Auf GitHub ein neues Repository anlegen, z. B. `todo-manager`. Im kostenlosen Plan muss es **öffentlich** sein, damit Pages funktioniert. Im Repo liegt nur der Programmcode, deine Aufgaben nie.
2. Im Repo **Add file → Upload files** und den kompletten Inhalt dieses Ordners hineinziehen (inklusive der Ordner `css`, `fonts`, `icons`, `js`, `supabase`, `vendor`). Commit.
3. **Settings → Pages**: Source „Deploy from a branch“, Branch `main`, Ordner `/ (root)`, speichern.
4. Nach ein bis zwei Minuten läuft die App unter `https://<dein-github-name>.github.io/todo-manager/`.

## Aufs Handy holen

- **Android (Chrome):** Seite öffnen → Menü → „App installieren“. Danach taucht der ToDo-Manager auch im Teilen-Menü auf: Link aus einer anderen App teilen, er landet als Aufgabe im Eingang.
- **iPhone (Safari):** Seite öffnen → Teilen → „Zum Home-Bildschirm“.

Ohne Sync hat jedes Gerät seinen eigenen Datenbestand. Für gemeinsame Daten auf Desktop und Handy den Sync einrichten (unten).

## Startdaten einspielen

Die Datei `startdaten.json` (liegt **nicht** in diesem Ordner und gehört nicht ins öffentliche Repo) enthält den Bereichsbaum und die offenen Aufgaben aus Google Tasks. In der App unter **Einstellungen → Daten → Sicherung einspielen** auswählen.

Alternativ alles aus Google Tasks holen, auch erledigte Aufgaben: auf [takeout.google.com](https://takeout.google.com) nur „Tasks“ auswählen, exportieren, ZIP entpacken und `Tasks.json` unter **Einstellungen → Daten → Google Tasks importieren** wählen. Bitte nur einen der beiden Wege nutzen, sonst gibt es die Aufgaben doppelt.

## Sync zwischen Geräten (Supabase)

1. Auf [supabase.com](https://supabase.com) ein Projekt anlegen (Region Frankfurt) oder ein vorhandenes nutzen. Die Tabelle heißt `todo_entities` und stört andere Tabellen nicht.
2. **SQL Editor:** Inhalt von `supabase/schema.sql` einfügen und ausführen.
3. **Authentication → Sign In / Providers → Email:** „Confirm email“ ausschalten. Sonst muss jedes neue Konto erst per Mail bestätigt werden.
4. **Project Settings → API:** „Project URL“ und den „anon“ bzw. „publishable“ Key kopieren und in `js/config.js` eintragen. Diesen Key darf jeder sehen, die Daten schützt Row Level Security. Den `service_role`- bzw. `secret`-Key **niemals** eintragen.
5. Geänderte `js/config.js` ins Repo hochladen.
6. In der App **Einstellungen → Synchronisation**: auf dem ersten Gerät „Konto anlegen“, auf allen weiteren Geräten mit denselben Daten „Anmelden“. Was schon lokal liegt, wird beim Anmelden übertragen.
7. Empfohlen: Wenn alle Konten angelegt sind, in Supabase unter **Authentication → Sign In / Providers** „Allow new users to sign up“ ausschalten. Dann kann niemand Fremdes über deine öffentliche Seite ein Konto anlegen.

Der Abgleich läuft automatisch: kurz nach jeder Änderung, jede Minute und beim Zurückkehren in die App. Offline gemachte Änderungen werden nachgeholt. Ändern zwei Geräte dieselbe Aufgabe, gilt die zuletzt gemachte Änderung.

Kostenlose Supabase-Projekte werden nach längerer Zeit ohne Zugriff pausiert. Bei täglicher Nutzung passiert das nicht, sonst im Dashboard wieder starten.

## Bedienung in Kürze

**Schnellerfassung** oben in jeder Liste versteht Kurzzeichen:

```
Bot-Schutz prüfen #preise/preisspion !1 @morgen +scraper https://beispiel.de
```

| Zeichen | Wirkung |
| --- | --- |
| `#bereich` oder `#bereich/unterbereich` | ordnet zu; ohne Angabe landet die Aufgabe im aktuellen Bereich bzw. im Eingang |
| `!1` bis `!4` | Priorität |
| `@heute`, `@morgen`, `@fr`, `@nw`, `@+3`, `@14.10.` | Fälligkeit |
| `+tag` | Tag |
| URL oder `\\server\pfad` | wird als Link angelegt |

**Stati:** Backlog, Geplant, In Arbeit, Test, Wartet, Blockiert, Erledigt, Verworfen. „Wartet“ fragt nach dem Grund und einer Wiedervorlage, „Blockiert“ und „Verworfen“ nach einem Grund. Die Angabe landet als Vermerk an der Aufgabe. Stati lassen sich unter Einstellungen umbenennen, umfärben, ergänzen und sortieren.

**Ziehen und Ablegen** (am Rechner): Aufgabe auf einen Bereich in der Seitenleiste ziehen verschiebt sie, in der Kanban-Ansicht in eine andere Spalte setzt den Status. Bereiche lassen sich auf andere Bereiche ziehen, um sie zu verschachteln.

**Tastenkürzel:** `N` neue Aufgabe, `/` suchen, `J`/`K` durch die Liste, `E` erledigt, `F` markieren, `Esc` schließen.

**Netzwerkpfade** wie `\\192.168.x.x\ordner` öffnen Browser aus Sicherheitsgründen nicht direkt. Ein Klick kopiert den Pfad, dann im Explorer einfügen.

Zugangsdaten gehören nicht in Vermerke, sondern in den Passwort-Manager.

## Updates einspielen

Geänderte Dateien im Repo ersetzen. Die App holt beim nächsten Öffnen mit Internet die neue Version. Falls nicht, die Seite einmal neu laden.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html` | Einstieg |
| `css/app.css` | Gestaltung, helles und dunkles Farbschema |
| `js/app.js` | Oberfläche |
| `js/store.js` | Datenmodell, Speichern im Browser, Import und Export |
| `js/sync.js` | Abgleich mit Supabase |
| `js/util.js` | Datum, Links, Schnellerfassung |
| `js/config.js` | Supabase-Zugang, leer = nur lokal |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline-Betrieb und Installation als App |
| `vendor/vue.global.prod.js` | Vue 3.5 (MIT-Lizenz), lokal statt aus dem Netz |
| `fonts/` | IBM Plex Sans und Mono (SIL Open Font License) |
| `supabase/schema.sql` | Tabelle und Zugriffsregeln für den Sync |

## Noch nicht enthalten

Anhänge (Dateien hochladen), wiederkehrende Aufgaben, Abhängigkeiten zwischen Aufgaben, Kalenderansicht und Zugriff für Claude über MCP. Mit Supabase als Datenbasis lässt sich ein MCP-Zugang später ergänzen, ohne die App umzubauen.
