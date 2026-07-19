# ProTrack

Webapp zur Erfassung von Arbeitszeit für unterschiedliche Kunden und Projekte.

## Tech-Stack

- React 19 + TypeScript, gebaut mit Vite
- Fluent UI v9 (`@fluentui/react-components`) als Komponenten- und Design-System
- Geplant: Firebase Hosting + Firebase-Backend (Functions/Firestore) als API-Schicht

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server
npm run build    # Typecheck + Produktionsbuild
npm run lint      # Oxlint
```

## Projektstruktur

```
src/
  components/   # UI-Komponenten (YearHeader, YearOverview, MonthCalendar, ...)
  theme/        # Light/Dark-Theme-Handling
  utils/        # Kalender- und Feiertagslogik (Bremen)
```

## Status

- [x] Jahresübersicht mit Feiertagen (Bremen) auf der Startseite
- [ ] Zeiterfassung pro Kunde/Projekt
- [ ] Firebase Hosting Deployment
- [ ] Backend-API (Firebase Functions/Firestore)
