import type { Strings } from './strings';

/**
 * Every text of the app, in German. It has the shape of en.ts (`Strings`): a key added there
 * must be added here too. Person-days are "PT" (Personentage), as German consulting writes them.
 */
export const de: Strings = {
  app: {
    name: 'ProTrack',
    pageTitle: (page: string) => `${page} · ProTrack`,
    updateReady:
      'Eine neue Version von ProTrack ist bereit. Lade neu, um sie zu verwenden; deine Daten bleiben, wie sie sind.',
    updateBroken:
      'Diese Version von ProTrack kann ihre Dateien nicht mehr laden. Lade neu, um die aktuelle zu bekommen.',
    reload: 'Neu laden',
    loadFailed:
      'ProTrack konnte deine Daten in diesem Browser nicht laden. Es ist nichts verloren: Lade neu, um es noch einmal zu versuchen. Gib nichts ein, bis deine Daten zu sehen sind; deine Backup-Datei bleibt, wie sie ist.',
  },

  languages: {
    en: 'English',
    de: 'Deutsch',
  },

  formats: {
    dateTime: 'd. MMM y, HH:mm',
    /** "1. Sept." */
    dayMonth: 'd. MMM',
    /** "1. Sept. 2026" */
    date: 'd. MMM y',
    /** "Di., 3. Nov." */
    weekDay: 'EEE, d. MMM',
    /** "Mo., 2. November" */
    weekDayLong: 'EEE, d. MMMM',
    /** "Mo., 2. Nov. 2026" */
    weekDayYear: 'EEE, d. MMM y',
  },

  common: {
    cancel: 'Abbrechen',
    ok: 'OK',
    close: 'Schließen',
    empty: '–',
    breadcrumb: 'Brotkrumennavigation',
    notBuilt: 'Diese Seite gibt es noch nicht.',
    customerCount: (n: number) => (n === 1 ? '1 Account' : `${n} Accounts`),
    projectCount: (n: number) =>
      n === 0 ? 'Keine Projekte' : n === 1 ? '1 Projekt' : `${n} Projekte`,
    orderCount: (n: number) => (n === 1 ? '1 Auftrag' : `${n} Aufträge`),
    days: (value: string) => `${value} PT`,
    hours: (value: string) => `${value} h`,
  },

  nav: {
    label: 'Hauptnavigation',
    customers: 'Meine Accounts',
    home: 'Start',
    projects: 'Meine Projekte',
    year: 'Mein Jahr',
    timesheet: 'Meine Zeiterfassung',
    settings: 'Einstellungen',
    previousYear: 'Vorheriges Jahr',
    nextYear: 'Nächstes Jahr',
    thisYear: 'Dieses Jahr',
    collapse: 'Navigation einklappen',
    expand: 'Navigation ausklappen',
  },

  shortcuts: {
    title: 'Tastenkürzel',
    goTo: 'Gehe zu',
    onPage: 'Auf der Seite',
    then: 'dann',
    keys: {
      pageUp: 'Bild ↑',
      pageDown: 'Bild ↓',
      shift: 'Umschalt',
      ctrl: 'Strg',
      escape: 'Esc',
    },
    step: 'Vorheriger/nächster Monat oder Jahr',
    stepYear: 'Vorheriges/nächstes Jahr',
    today: 'Zeiterfassung, aktueller Monat',
    create: 'Neu',
    save: 'Speichern',
    cancel: 'Abbrechen',
    copy: 'Letzten Buchungstag kopieren',
    help: 'Hilfe',
  },

  backupStatus: {
    unsupported: 'Kein Backup',
    off: 'Kein Backup',
    paused: 'Backup pausiert',
    saving: 'Backup wird gespeichert',
    saved: 'Backup aktuell',
    conflict: 'Backup woanders geändert',
    error: 'Backup nicht gespeichert',
  },

  splitSlider: {
    handle: (left: string, right: string) => `Aufteilung zwischen ${left} und ${right}`,
    valueText: (left: string, leftValue: number, right: string, rightValue: number) =>
      `${left} ${leftValue} %, ${right} ${rightValue} %`,
  },

  months: [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ],

  weekdaysShort: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  weekdaysNarrow: ['M', 'D', 'M', 'D', 'F', 'S', 'S'],

  monthsShort: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],

  regions: {
    BW: 'Baden-Württemberg',
    BY: 'Bayern',
    BE: 'Berlin',
    BB: 'Brandenburg',
    HB: 'Bremen',
    HH: 'Hamburg',
    HE: 'Hessen',
    MV: 'Mecklenburg-Vorpommern',
    NI: 'Niedersachsen',
    NW: 'Nordrhein-Westfalen',
    RP: 'Rheinland-Pfalz',
    SL: 'Saarland',
    SN: 'Sachsen',
    ST: 'Sachsen-Anhalt',
    SH: 'Schleswig-Holstein',
    TH: 'Thüringen',
  },

  holidays: {
    newYear: 'Neujahr',
    epiphany: 'Heilige Drei Könige',
    womensDay: 'Internationaler Frauentag',
    goodFriday: 'Karfreitag',
    easterMonday: 'Ostermontag',
    labourDay: 'Tag der Arbeit',
    ascension: 'Christi Himmelfahrt',
    whitMonday: 'Pfingstmontag',
    corpusChristi: 'Fronleichnam',
    assumption: 'Mariä Himmelfahrt',
    childrensDay: 'Weltkindertag',
    unityDay: 'Tag der Deutschen Einheit',
    reformation: 'Reformationstag',
    allSaints: 'Allerheiligen',
    repentance: 'Buß- und Bettag',
    christmas: '1. Weihnachtstag',
    boxingDay: '2. Weihnachtstag',
  },

  locations: {
    onsite: 'Vor Ort',
    home: 'Homeoffice',
    reply: 'Reply',
    ooo: 'Abwesend',
  },

  billing: {
    chargeable: 'Chargeable',
    nonChargeable: 'Non-chargeable',
    neutral: 'Neutral',
  },

  status: {
    active: 'Aktiv',
    completed: 'Abgeschlossen',
  },

  bookingModes: {
    po: 'PO-gebunden',
    open: 'Frei buchbar',
  },

  projectColors: {
    indigo: 'Indigo',
    pink: 'Pink',
    orange: 'Orange',
    cyan: 'Cyan',
    violet: 'Violett',
    green: 'Grün',
    blue: 'Blau',
    amber: 'Bernstein',
  },

  home: {
    title: 'Start',
    percent: (value: number) => `${value} %`,
    days: (value: string) => (value === '1' ? '1 Tag' : `${value} Tage`),
    booked: (year: number) => `Gebucht ${year}`,
    bookedTitle: 'Gebuchte chargeable Tage',
    forecast: 'Forecast Jahresende',
    forecastTitle: 'Chargeable Tage bis Jahresende',
    forecastDetail: (booked: string, planned: string) => `${booked} gebucht + ${planned} Forecast`,
    chargeForecast: 'Forecast %',
    chargeForecastTitle: 'Gebuchte Monate, dann Monate mit Forecast',
    chargeForecastDetail: (chargeable: string, available: string, months: number) =>
      `${chargeable}/${available} PT · ${months === 1 ? '1 Monat' : `${months} Monate`}`,
    chargeability: 'Chargeability',
    chargeabilityTitle: 'Chargeable ÷ (Arbeitstage − abwesend − neutral)',
    chargeabilityDetail: (chargeable: string, available: string, target: number) =>
      `${chargeable}/${available} PT · Ziel ${target} %`,
    tooltip: (title: string, detail: string) => `${title}\n${detail}`,

    chargeChart: {
      title: 'Chargeability nach Monat',
      booked: 'Gebucht',
      forecast: 'Forecast',
      target: 'Ziel',
      label: (year: number) => `Chargeability nach Monat ${year}`,
      bar: (month: string, percent: string, chargeable: string, available: string) =>
        `${month}: ${percent} · ${chargeable}/${available} PT`,
      barForecast: (bar: string) => `${bar} · Forecast`,
      noDays: (month: string) => `${month}: keine Tage`,
    },

    budgets: {
      title: 'Restbudget nach Projekt',
      label: 'Budget je aktivem Projekt',
      columns: {
        project: 'Projekt',
        used: 'Budget verbraucht',
        booked: 'Gebucht',
        budget: 'Budget',
        remaining: 'Rest',
      },
      bar: (name: string, booked: string, budget: string) => `${name}: ${booked}/${budget}`,
      empty: 'Noch keine aktiven Projekte.',
    },

    locationChart: {
      title: 'Gebucht nach Ort und Monat',
      label: (year: number) => `Gebucht nach Ort und Monat ${year}`,
      part: (location: string, percent: string) => `${location} ${percent}`,
      bar: (month: string, parts: string[]) => `${month}: ${parts.join(', ')}`,
      nothing: (month: string) => `${month}: nichts gebucht`,
    },

    daysChart: {
      title: 'Tage nach Ort und Monat',
      label: (year: number) => `Tage nach Ort und Monat ${year}`,
      part: (location: string, days: string) => `${location} ${days}`,
      bar: (month: string, parts: string[], total: string) =>
        `${month}: ${parts.join(', ')} · Σ ${total}`,
      nothing: (month: string) => `${month}: nichts gebucht`,
    },

    trends: {
      chargeTitle: 'Chargeability im Verlauf',
      locationTitle: 'Gebucht nach Ort im Verlauf',
      month: 'Monat',
    },

    startTitle: 'Erste Schritte',
    startHint:
      'Lege deinen ersten Account in Meine Accounts an und deine Projekte in Meine Projekte',
  },

  projects: {
    title: 'Meine Projekte',
    emptyTitle: 'Noch keine Accounts',
    emptyBefore: 'Lege deinen ersten Account in ',
    emptyLink: 'Meine Accounts',
    emptyAfter: ' an.',
    newProject: 'Neues Projekt',
    tabsLabel: 'Ansichten von Meine Projekte',
    tabProjects: 'Projekte',
    tabForecast: 'Forecast',
    tabArchive: 'Archiv',

    tables: {
      active: 'Aktive Projekte',
      completed: 'Abgeschlossene Projekte',
    },
    archiveEmpty:
      'Noch keine abgeschlossenen Projekte. Ein Projekt kommt hierher, wenn du seinen Status auf Abgeschlossen setzt.',
    collapse: (name: string) => `${name} einklappen`,
    expand: (name: string) => `${name} ausklappen`,
    edit: (name: string) => `${name} bearbeiten`,
    addProject: 'Projekt hinzufügen',
    addProjectFor: (customer: string) => `Neues Projekt für ${customer}`,
    moveUp: (name: string) => `${name} nach oben`,
    moveDown: (name: string) => `${name} nach unten`,
    noOrders: 'Keine Aufträge',
    total: 'Summe',
    columns: {
      name: 'Account › Projekt › Auftrag',
      timeline: 'Laufzeit',
      location: 'Ort',
      billing: 'Abrechnung',
      budget: 'Budget',
      booked: 'Gebucht',
      remaining: 'Rest',
    },
  },

  forecast: {
    tableLabel: (year: number) => `Forecast ${year}`,
    copy: 'Kopieren',
    copied: 'Kopiert',
    copyHint: 'Forecast dieses und der nächsten zwei Monate des Jahres für eine E-Mail kopieren',
    copyProject: 'Projekt',
    copyRow: (project: string, place: 'onsite' | 'remote') =>
      `${project} › ${place === 'onsite' ? 'on-site' : 'remote'}`,
    total: 'Summe',
    budget: 'Budget',
    remaining: 'Rest',
    deltaHint: 'Budget − gebucht − Forecast',
    cell: (name: string, month: string) => `${name}, ${month}`,
    foldedName: (from: string, to: string, year: number) => `${from} bis ${to} ${year}`,
    fold: (range: string) => `${range} einklappen`,
    unfold: (range: string) => `${range} ausklappen`,
    outsideTimeline: (range: string) => `Läuft ${range}`,
    days: 'Alle Projekte',
    daysHint: 'Gebucht, ab diesem Monat Forecast',
    overWorkingDays: 'Mehr Tage als Arbeitstage',
    workingDays: 'Arbeitstage',
    workingDaysHint: (region: string) => `Mo–Fr ohne Feiertage (${region})`,
    workingDaysHintNoRegion: 'Mo–Fr ohne bundesweite Feiertage',
    yearEndHint: (hint: string, percent: number) =>
      `${hint} · 24./31.12. ${percent === 100 ? 'frei' : `${percent} % frei`}`,
    chargeability: 'Chargeability',
    chargeabilityCell: (month: string, chargeable: string, available: string) =>
      `${month}: ${chargeable}/${available} PT`,
    chargeabilityHint: 'Chargeable ÷ (Arbeitstage − abwesend − neutral)',
    target: (percent: number) => `Ziel ${percent} %`,
    emptyYear: (year: number) =>
      `${year} läuft kein Auftrag. Füge deinen Projekten Aufträge hinzu oder wähle oben ein anderes Jahr.`,
  },

  year: {
    title: 'Mein Jahr',
    calendarTitle: (year: number) => `Kalender ${year}`,
    openMonth: (month: string) => `Zeiterfassung ${month}`,
    day: (parts: string[]) => parts.join(' · '),
    dayWeekend: 'Wochenende',
    dayFree: 'Nichts gebucht',
    dayHoliday: (name: string) => `${name} (Feiertag)`,
    dayEntry: (name: string, days: string) => `${name} ${days}`,
    dayToday: (text: string) => `${text} (heute)`,
  },

  timesheet: {
    title: 'Meine Zeiterfassung',
    previousMonth: (month: string) => `Zurück: ${month}`,
    nextMonth: (month: string) => `Weiter: ${month}`,
    thisMonth: 'Dieser Monat',
    tableLabel: (month: string) => `Zeiterfassung, ${month}`,
    columns: {
      day: 'Tag',
      hours: 'Stunden',
      order: 'Projekt · Auftrag',
      location: 'Ort',
      notes: 'Notizen',
      total: 'Summe',
      forecast: 'Forecast',
      remaining: 'Rest',
    },
    totalHint: (month: string) => `Im ${month} bisher gebucht`,
    forecastHint: (month: string) => `Forecast ${month}`,
    remainingHint: 'Budget − bisher gebucht',
    hoursLabel: (day: string) => `Stunden, ${day}`,
    orderLabel: (day: string) => `Projekt und Auftrag, ${day}`,
    locationLabel: (day: string) => `Ort, ${day}`,
    noteLabel: (day: string) => `Notizen, ${day}`,
    addNote: 'Neue Notiz',
    noteTitle: (day: string) => `Notiz · ${day}`,
    editNote: (day: string) => `Notiz zu ${day} schreiben`,
    writeNote: 'Hier klicken, um eine Notiz zu schreiben.',
    noNote: 'Keine Notiz.',
    chooseOrder: 'Auftrag wählen',
    noOrders: 'An diesem Tag läuft kein Auftrag.',
    addEntry: (day: string) => `Eintrag hinzufügen, ${day}`,
    addEntryBlocked: 'Erst leere Zeile füllen',
    removeEntry: (day: string) => `Eintrag löschen, ${day}`,
    dayHours: (hours: string) => `${hours} gebucht`,
    monthSum: 'Σ',
    monthSumHint: (month: string) => `Summen für ${month}`,
    lockMonth: 'Monat sperren',
    lockHint: (month: string) => `${month} sperren`,
    unlockHint: (month: string) => `${month} entsperren`,
    lockedCell: 'Gesperrt',
    emptyBefore: 'Es gibt noch keine Aufträge. Füge deinen Projekten Aufträge hinzu in ',
    emptyLink: 'Meine Projekte',
    emptyAfter: '.',
  },

  projectEdit: {
    pageTitleNew: 'Neues Projekt',
    pageTitleEdit: 'Projekt bearbeiten',
    back: 'Meine Projekte',
    newTitle: 'Neues Projekt',
    notFoundTitle: 'Projekt nicht gefunden',
    notFoundBefore: 'Dieses Projekt gibt es nicht mehr. Geh zurück zu ',
    notFoundLink: 'Meine Projekte',
    notFoundAfter: ', um ein anderes zu wählen.',
    delete: 'Projekt löschen',
    deleteBlocked: 'Hat Buchungen',
    keep: 'Projekt behalten',
    add: 'Projekt anlegen',
    save: 'Änderungen speichern',

    details: 'Projektdaten',
    name: 'Projektname',
    customer: 'Account',
    chooseCustomer: 'Account wählen',
    status: 'Status',
    billing: 'Abrechnung',
    booking: 'Buchung',
    defaultLocation: 'Standard-Arbeitsort',
    color: 'Farbe',
    customColor: (hex: string) => `Eigene Farbe ${hex}`,
    removeCustomColor: (hex: string) => `${hex} entfernen`,
    addCustomColor: 'Eigene Farbe hinzufügen',
    nameRequired: 'Gib den Namen des Projekts ein.',
    nameTaken: (name: string, customer: string) =>
      `${customer} hat schon ein Projekt namens ${name}.`,
    customerRequired: 'Wähle den Account dieses Projekts.',

    orders: 'Aufträge',
    ordersTable: 'Aufträge dieses Projekts',
    columns: {
      name: 'Auftrag',
      start: 'Beginn',
      end: 'Ende',
      location: 'Ort',
      budget: 'Budget (Tage)',
    },
    newOrder: (n: number) => `Auftrag ${n}`,
    orderName: (n: number) => `Name von Auftrag ${n}`,
    orderStart: (name: string) => `Beginn von ${name}`,
    orderEnd: (name: string) => `Ende von ${name}`,
    orderLocation: (name: string) => `Ort von ${name}`,
    orderBudget: (name: string) => `Budget von ${name}`,
    removeOrder: (name: string) => `${name} entfernen`,
    removeOrderBlocked: (name: string) => `${name} hat Buchungen`,
    addOrder: 'Auftrag hinzufügen',
    noOrders:
      'Noch keine Aufträge. Füge einen hinzu, um dem Projekt ein Budget und eine Laufzeit zu geben.',
    ordersSummary: (orders: string, budget: string, range: string) =>
      `${orders} · ${budget} Budget · ${range}`,
    orderErrors: {
      name: (n: number) => `Auftrag ${n}: Gib einen Namen ein.`,
      dates: (name: string) => `${name}: Gib Beginn und Ende ein.`,
      endBeforeStart: (name: string) => `${name}: Das Ende liegt vor dem Beginn.`,
      budget: (name: string) => `${name}: Gib das Budget in Tagen ein, etwa 12 oder 0,5.`,
    },
  },

  customers: {
    tableLabel: 'Accounts',
    column: 'Account',
    empty: 'Noch keine Accounts',
    add: 'Account hinzufügen',
    newCustomer: 'Neuer Account',
    edit: (name: string) => `${name} bearbeiten`,
    moveUp: (name: string) => `${name} nach oben`,
    moveDown: (name: string) => `${name} nach unten`,
  },

  customerEdit: {
    pageTitleNew: 'Neuer Account',
    pageTitleEdit: 'Account bearbeiten',
    back: 'Meine Accounts',
    newTitle: 'Neuer Account',
    notFoundTitle: 'Account nicht gefunden',
    notFoundBefore: 'Diesen Account gibt es nicht mehr. Geh zurück zu ',
    notFoundLink: 'Meine Accounts',
    notFoundAfter: ', um einen anderen zu wählen.',
    delete: 'Account löschen',
    deleteBlocked: 'Hat Projekte',
    keep: 'Account behalten',
    add: 'Account anlegen',
    save: 'Änderungen speichern',
    details: 'Account-Daten',
    name: 'Name',
    nameRequired: 'Gib den Namen des Accounts ein.',
    nameTaken: (name: string) => `Du hast schon einen Account namens ${name}.`,
    logo: 'Logo',
    uploadLogo: 'Logo hochladen',
    importLogo: 'Von Website übernehmen',
    replaceLogo: 'Logo ersetzen',
    removeLogo: 'Logo entfernen',
    dropHint: 'Zieh eine Bilddatei in dieses Feld oder lade eine hoch.',
    logoErrors: {
      type: 'Wähle eine SVG-, PNG- oder JPEG-Datei.',
      size: 'Diese Datei ist größer als 1 MB. Wähle eine kleinere.',
      notSvg: 'Diese Datei ist kein SVG-Bild.',
      unreadable: 'Diese Datei konnte nicht gelesen werden.',
    },
  },

  logoImport: {
    title: 'Logo von Website übernehmen',
    intro:
      'Gib die Adresse der Website des Accounts ein. ProTrack fragt den Icon-Dienst icon.horse nach dem App-Icon oder Favicon der Seite, icon.horse sieht also diese Adresse.',
    website: 'Website',
    placeholder: 'reply.com',
    find: 'Icon suchen',
    finding: 'Icon wird gesucht …',
    previewHint:
      'Siehst du einen Buchstaben statt des Logos, hat die Seite kein Icon. Versuch eine andere Adresse oder lade das Logo hoch.',
    size: (width: number, height: number) => `${width} × ${height} px`,
    smallIcon:
      'Nur ein kleines Favicon: Es kann unscharf aussehen. Lade das Logo hoch, um ein schärferes zu bekommen.',
    use: 'Als Logo verwenden',
    close: 'Schließen',
    errors: {
      address: 'Gib eine Webadresse ein, etwa reply.com.',
      unreachable:
        'Für diese Adresse ließ sich kein Icon laden. Prüfe sie und deine Verbindung oder lade das Logo hoch.',
    },
  },

  settings: {
    title: 'Einstellungen',

    language: 'Sprache',
    regionTitle: 'Region',
    federalState: 'Bundesland',
    notSet: 'Nicht gewählt',
    regionHintNotSet:
      'Wähle dein Bundesland, um seine Feiertage von deinen Arbeitstagen abzuziehen. Bis dahin zählen nur die bundesweiten Feiertage.',
    yearEnd: '24. und 31. Dezember',
    yearEndChoices: { 0: 'Arbeitstage', 50: 'Halbe Tage frei', 100: 'Ganze Tage frei' } as Record<
      number,
      string
    >,

    targetsTitle: 'Ziele',
    chargeability: 'Chargeability',
    locationsTitle: 'Gebuchte Tage je Ort',

    backupTitle: 'Backup-Datei',
    backupUnsupported:
      'Dein Browser kann keine Backup-Datei führen. Öffne ProTrack in Chrome oder Edge oder exportiere deine Daten regelmäßig.',
    backupIntro:
      'Wähle eine Datei, etwa in einem Ordner, der mit der Cloud synchronisiert wird. ProTrack speichert deine Daten nach jeder Änderung darin. Um deine Daten auf einen anderen Rechner zu bringen, öffne dort dieselbe Datei.',
    createBackup: 'Backup-Datei anlegen',
    openBackup: 'Backup-Datei öffnen',
    savesToBefore: 'ProTrack speichert deine Daten nach jeder Änderung in ',
    savesToAfter: '.',
    lastSaved: (dateTime: string) => `Zuletzt gespeichert ${dateTime}.`,
    pausedHint:
      'Dein Browser fragt nach einem Neustart erneut nach Zugriff. Setze fort, um deine Änderungen zu speichern.',
    pending: (savedAt: string, customers: string) =>
      ` enthält andere Daten, gespeichert ${savedAt} · ${customers}. Lade sie, um die Daten auf diesem Gerät zu ersetzen, oder überschreibe die Datei mit den Daten auf diesem Gerät.`,
    conflict: (savedAt: string, customers: string) =>
      `Die Datei wurde ${savedAt} auf einem anderen Gerät gespeichert · ${customers}. Lade ihre Daten, um die Daten auf diesem Gerät zu ersetzen, oder überschreibe sie mit den Daten auf diesem Gerät.`,
    loadFromFile: 'Aus Datei laden',
    overwriteFile: 'Datei überschreiben',
    resume: 'Backups fortsetzen',
    saveNow: 'Jetzt speichern',
    unlink: 'Datei trennen',
    backupErrors: {
      needsPermission: 'ProTrack braucht deine Erlaubnis, in diese Datei zu schreiben.',
      gone: 'Die Backup-Datei ist weg. Wähle sie erneut oder lege eine neue an.',
      notAllowed: 'ProTrack darf nicht in die Backup-Datei schreiben.',
      writeFailed: 'Die Backup-Datei konnte nicht geschrieben werden.',
      unknown: 'Etwas ist schiefgelaufen.',
    },

    snapshots: {
      title: 'Wiederherstellungspunkte',
      intro: (max: number) =>
        `ProTrack legt einmal am Tag eine Kopie deiner Daten auf diesem Gerät ab, außerdem vor einem Import, vor dem Laden der Backup-Datei, vor einer Wiederherstellung und vor dem Löschen eines Accounts oder Projekts. Die letzten ${max} bleiben erhalten. Sie liegen nur auf diesem Gerät und nicht in deiner Backup-Datei.`,
      none: 'Noch keine Wiederherstellungspunkte. Der erste entsteht, sobald du Daten hast.',
      reasons: {
        daily: 'Täglich',
        import: 'Vor einem Import',
        backupLoad: 'Vor dem Laden der Backup-Datei',
        restore: 'Vor einer Wiederherstellung',
        deleteProject: (name: string) =>
          name ? `Vor dem Löschen von ${name}` : 'Vor dem Löschen eines Projekts',
        deleteCustomer: (name: string) =>
          name ? `Vor dem Löschen von ${name}` : 'Vor dem Löschen eines Accounts',
      },
      counts: (customers: string, projects: string, bookings: number) =>
        `${customers}, ${projects}, ${bookings === 1 ? '1 Buchung' : `${bookings} Buchungen`}`,
      restore: 'Wiederherstellen',
      confirm: (date: string, withBackup: boolean) =>
        `Die Wiederherstellung ersetzt alle Daten auf diesem Gerät${withBackup ? ' und in deiner Backup-Datei' : ''} durch die Daten vom ${date}. Deine aktuellen Daten bekommen vorher einen Wiederherstellungspunkt, du kannst also zurück.`,
      restored: (date: string) => `Die Daten vom ${date} wurden wiederhergestellt.`,
      download: (date: string) => `${date} herunterladen`,
      showAll: (n: number) => (n === 1 ? '1 weiteren zeigen' : `${n} weitere zeigen`),
      gone: 'Dieser Wiederherstellungspunkt ist nicht mehr da.',
    },

    transferTitle: 'Import und Export',
    transferIntro:
      'Export speichert alle deine Daten als JSON-Datei. Import liest eine solche Datei und ersetzt alle Daten auf diesem Gerät.',
    exportData: 'Daten exportieren',
    importData: 'Daten importieren',
    importPending: (savedAt: string, customers: string, withBackup: boolean) =>
      ` · gespeichert ${savedAt} · ${customers}. Der Import ersetzt alle Daten auf diesem Gerät${withBackup ? ' und in deiner Backup-Datei' : ''}.`,
    replaceData: 'Meine Daten ersetzen',
    imported: 'Deine Daten wurden importiert.',

    resetTitle: 'Zurücksetzen',
    resetIntro: 'Löscht alle Daten auf diesem Gerät und beginnt mit einem leeren ProTrack.',
    resetWarning:
      'Damit werden alle Accounts, Projekte und Einstellungen auf diesem Gerät endgültig gelöscht.',
    resetKeepsBackup: (file: string) =>
      `Deine Backup-Datei ${file} bleibt, wie sie ist, und wird getrennt.`,
    resetExportFirst: 'Exportiere deine Daten vorher, falls du sie noch brauchen könntest.',
    deleteAll: 'Alle Daten löschen',
    deleteEverything: 'Alles löschen',
    resetDone: 'Alle Daten wurden gelöscht.',
  },

  syncFileErrors: {
    notJson: 'Diese Datei ist kein gültiges JSON.',
    notProtrack: 'Diese Datei ist keine ProTrack-Datei.',
    noVersion: 'Diese Datei hat keine gültige Schemaversion.',
    newerVersion:
      'Diese Datei stammt aus einer neueren Version von ProTrack. Aktualisiere zuerst die App.',
  },
};
