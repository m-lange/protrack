/**
 * Every text of the app, in English, the reference for the other languages (`Strings`). To
 * change a text, change it here and in de.ts. To add a language, copy this file, type it as
 * `Strings`, translate the values and list it in model.ts (LANGUAGE_CODES) and language.ts.
 * Functions build texts with numbers, names and dates.
 */
export const en = {
  app: {
    name: 'ProTrack',
    /** The browser tab title of a page. */
    pageTitle: (page: string) => `${page} · ProTrack`,
    updateReady: 'A new version of ProTrack is ready. Reload to use it; your data stays as it is.',
    updateBroken:
      'This version of ProTrack can’t load its files anymore. Reload to get the current one.',
    reload: 'Reload',
    loadFailed:
      'ProTrack couldn’t load your data from this browser. Nothing is lost: reload to try again. Until your data shows, don’t enter anything; your backup file stays as it is.',
  },

  /** The languages of the UI, each in its own language, so everyone finds theirs. */
  languages: {
    en: 'English',
    de: 'Deutsch',
  },

  /** Date formats for Angular's DatePipe, see https://angular.dev/api/common/DatePipe. */
  formats: {
    today: 'fullDate',
    dateTime: 'MMM d, y, h:mm a',
    /** A day in a timeline: "Sep 1". */
    dayMonth: 'MMM d',
    /** A day with its year: "Sep 1, 2026". */
    date: 'MMM d, y',
    /** A day of a week: "Tue, Nov 3". */
    weekDay: 'EEE, MMM d',
    /** A day with its month written out, for the note dialog: "Mon, November 2". */
    weekDayLong: 'EEE, MMMM d',
    /** A day with its weekday and year: "Mon, Nov 2, 2026". */
    weekDayYear: 'EEE, MMM d, y',
  },

  common: {
    cancel: 'Cancel',
    save: 'Save',
    ok: 'OK',
    close: 'Close',
    /** An empty value, also the placeholder of empty number inputs. */
    empty: '–',
    breadcrumb: 'Breadcrumb',
    notBuilt: 'This page is not built yet.',
    customerCount: (n: number) => (n === 1 ? '1 account' : `${n} accounts`),
    projectCount: (n: number) =>
      n === 0 ? 'No projects' : n === 1 ? '1 project' : `${n} projects`,
    orderCount: (n: number) => (n === 1 ? '1 order' : `${n} orders`),
    /** Person-days with their unit: "12 d". */
    days: (value: string) => `${value} d`,
    /** Hours with their unit: "12 h". */
    hours: (value: string) => `${value} h`,
  },

  nav: {
    label: 'Primary',
    customers: 'My accounts',
    home: 'Home',
    projects: 'My projects',
    year: 'My year',
    timesheet: 'My timesheet',
    settings: 'Settings',
    previousYear: 'Previous year',
    nextYear: 'Next year',
    thisYear: 'This year',
    /** The icon button at the top of the side navigation that collapses it to its icons and back. */
    collapse: 'Collapse navigation',
    expand: 'Expand navigation',
  },

  /** The dialog that lists the keyboard shortcuts ("?"). Pages are named as in the navigation. */
  shortcuts: {
    title: 'Keyboard shortcuts',
    goTo: 'Go to',
    onPage: 'On the page',
    /** Between two keys pressed one after the other: "G then T". */
    then: 'then',
    /** Key names as printed on the keyboard. */
    keys: {
      pageUp: 'Page Up',
      pageDown: 'Page Down',
      shift: 'Shift',
      ctrl: 'Ctrl',
      escape: 'Esc',
    },
    step: 'Previous/next month or year',
    stepYear: 'Previous/next year',
    today: 'My timesheet, this month',
    create: 'New',
    save: 'Save',
    cancel: 'Cancel',
    copy: 'Copy last booked day',
    help: 'Help',
  },

  /** The backup file's status chip, in the top bar and in settings. */
  backupStatus: {
    unsupported: 'No backup',
    off: 'No backup',
    paused: 'Backup paused',
    saving: 'Saving backup',
    saved: 'Backup up to date',
    conflict: 'Backup changed elsewhere',
    error: 'Backup not saved',
  },

  /** A bar split into shares that add up to 100%, with a handle between each two shares. */
  splitSlider: {
    handle: (left: string, right: string) => `Split between ${left} and ${right}`,
    valueText: (left: string, leftValue: number, right: string, rightValue: number) =>
      `${left} ${leftValue}%, ${right} ${rightValue}%`,
  },

  months: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],

  /** Days of the week, Monday first. */
  weekdaysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  /** One letter per day, for calendar heads. */
  weekdaysNarrow: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],

  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

  /** Names of the federal states, by their code. */
  regions: {
    BW: 'Baden-Württemberg',
    BY: 'Bavaria',
    BE: 'Berlin',
    BB: 'Brandenburg',
    HB: 'Bremen',
    HH: 'Hamburg',
    HE: 'Hesse',
    MV: 'Mecklenburg-Western Pomerania',
    NI: 'Lower Saxony',
    NW: 'North Rhine-Westphalia',
    RP: 'Rhineland-Palatinate',
    SL: 'Saarland',
    SN: 'Saxony',
    ST: 'Saxony-Anhalt',
    SH: 'Schleswig-Holstein',
    TH: 'Thuringia',
  },

  /** Public holidays, by their id in shared/dates/holidays.ts. */
  holidays: {
    newYear: 'New Year’s Day',
    epiphany: 'Epiphany',
    womensDay: 'International Women’s Day',
    goodFriday: 'Good Friday',
    easterMonday: 'Easter Monday',
    labourDay: 'Labour Day',
    ascension: 'Ascension Day',
    whitMonday: 'Whit Monday',
    corpusChristi: 'Corpus Christi',
    assumption: 'Assumption Day',
    childrensDay: 'World Children’s Day',
    unityDay: 'German Unity Day',
    reformation: 'Reformation Day',
    allSaints: 'All Saints’ Day',
    repentance: 'Day of Repentance and Prayer',
    christmas: 'Christmas Day',
    boxingDay: 'Boxing Day',
  },

  locations: {
    onsite: 'On-site',
    home: 'Home office',
    reply: 'Reply',
    ooo: 'Out of office',
  },

  billing: {
    chargeable: 'Chargeable',
    nonChargeable: 'Non-chargeable',
    neutral: 'Neutral',
  },

  status: {
    active: 'Active',
    completed: 'Completed',
  },

  /** How a project is booked. */
  bookingModes: {
    po: 'PO-restricted',
    open: 'Open booking',
  },

  /** The preset project colors, as the color buttons announce them. */
  projectColors: {
    indigo: 'Indigo',
    pink: 'Pink',
    orange: 'Orange',
    cyan: 'Cyan',
    violet: 'Violet',
    green: 'Green',
    blue: 'Blue',
    amber: 'Amber',
  },

  home: {
    title: 'Home',
    /** A share on a KPI tile, with a non-breaking space before the sign: "73 %". */
    percent: (value: number) => `${value}\u00a0%`,
    /** Person-days on a KPI tile, written out: "143 days", "1 day". */
    days: (value: string) => (value === '1' ? '1 day' : `${value} days`),
    booked: (year: number) => `Booked ${year}`,
    bookedTitle: 'Chargeable days booked',
    forecast: 'Year-end forecast',
    forecastTitle: 'Chargeable days by year end',
    forecastDetail: (booked: string, planned: string) => `${booked} booked + ${planned} planned`,
    projection: 'Year-end projection',
    projectionTitle: 'At your pace so far',
    chargeability: 'Chargeability',
    chargeabilityTitle: 'Chargeable ÷ (working days − out of office − neutral)',
    chargeabilityDetail: (chargeable: string, available: string, target: number) =>
      `${chargeable}/${available} d · target ${target}%`,
    /** A tile's tooltip: what it counts, then its figures on a new line. */
    tooltip: (title: string, detail: string) => `${title}\n${detail}`,

    /** The bar chart of chargeability per month (TargetBarChart). */
    chargeChart: {
      title: 'Chargeability by month',
      booked: 'Booked',
      forecast: 'Forecast',
      /** The dashed line, labeled beside the plot with its percent. */
      target: 'Target',
      /** The name of the chart for screen readers. */
      label: (year: number) => `Chargeability by month ${year}`,
      bar: (month: string, percent: string, chargeable: string, available: string) =>
        `${month}: ${percent} · ${chargeable}/${available} d`,
      barForecast: (bar: string) => `${bar} · forecast`,
      noDays: (month: string) => `${month}: no days`,
    },

    /** The budget overview of the active projects (BudgetBar). */
    budgets: {
      title: 'Remaining budget by project',
      label: 'Budget per active project',
      columns: {
        project: 'Project',
        used: 'Budget used',
        booked: 'Booked',
        budget: 'Budget',
        remaining: 'Remaining',
      },
      bar: (name: string, booked: string, budget: string) => `${name}: ${booked}/${budget}`,
      empty: 'No active projects yet.',
    },

    /** The 100 % stacked bars of the booked days per work location (ShareChart). */
    locationChart: {
      title: 'Booked by location and month',
      label: (year: number) => `Booked by location and month ${year}`,
      part: (location: string, percent: string) => `${location} ${percent}`,
      bar: (month: string, parts: string[]) => `${month}: ${parts.join(', ')}`,
      nothing: (month: string) => `${month}: nothing booked`,
    },

    /** The stacked bars of the booked days per location, out of office included (LocationDaysChart). */
    daysChart: {
      title: 'Days by location and month',
      label: (year: number) => `Days by location and month ${year}`,
      part: (location: string, days: string) => `${location} ${days}`,
      bar: (month: string, parts: string[], total: string) =>
        `${month}: ${parts.join(', ')} · Σ ${total}`,
      nothing: (month: string) => `${month}: nothing booked`,
    },

    /** The two line charts at the bottom of Home, over all years (TrendChart). */
    trends: {
      chargeTitle: 'Chargeability over time',
      locationTitle: 'Booked by location over time',
      /** The head of the first column of the charts' tables for screen readers. */
      month: 'Month',
    },

    startTitle: 'Get started',
    startHint:
      'Add your first account in My accounts and your projects in My projects, then book your days in My timesheet.',
  },

  projects: {
    title: 'My projects',
    emptyTitle: 'No accounts yet',
    emptyBefore: 'Add your first account in ',
    emptyLink: 'My accounts',
    emptyAfter: '. Its projects and orders go underneath it.',
    newProject: 'New project',
    tabsLabel: 'My projects views',
    tabProjects: 'Projects',
    tabForecast: 'Forecast',
    /** The tab of the completed projects. */
    tabArchive: 'Archive',

    /** The names of the tree tables for screen readers: Projects tab (active), Archive (completed). */
    tables: {
      active: 'Active projects',
      completed: 'Completed projects',
    },
    archiveEmpty:
      'No completed projects yet. A project moves here when you set its status to Completed.',
    collapse: (name: string) => `Collapse ${name}`,
    expand: (name: string) => `Expand ${name}`,
    edit: (name: string) => `Edit ${name}`,
    addProject: 'Add project',
    addProjectFor: (customer: string) => `Add project for ${customer}`,
    moveUp: (name: string) => `Move ${name} up`,
    moveDown: (name: string) => `Move ${name} down`,
    noOrders: 'No orders',
    total: 'Total',
    columns: {
      name: 'Account › project › order',
      timeline: 'Timeline',
      location: 'Location',
      billing: 'Billing',
      budget: 'Budget',
      booked: 'Booked',
      remaining: 'Remaining',
    },
  },

  forecast: {
    tableLabel: (year: number) => `Forecast ${year}`,
    total: 'Total',
    budget: 'Budget',
    remaining: 'Remaining',
    deltaHint: 'Budget − booked − planned',
    cell: (name: string, month: string) => `${name}, ${month}`,
    /** January through a later month, folded into one column. */
    foldedName: (from: string, to: string, year: number) => `${from} to ${to} ${year}`,
    fold: (range: string) => `Collapse ${range}`,
    unfold: (range: string) => `Expand ${range}`,
    outsideTimeline: (range: string) => `Runs ${range}`,
    days: 'All projects',
    daysHint: 'Booked, from this month forecast',
    workingDays: 'Working days',
    workingDaysHint: (region: string) => `Mon–Fri without holidays (${region})`,
    workingDaysHintNoRegion: 'Mon–Fri without nationwide holidays',
    /** The working days hint with December 24 and 31, while they are off in part (Settings). */
    yearEndHint: (hint: string, percent: number) =>
      `${hint} · Dec 24/31 ${percent === 100 ? 'off' : `${percent} % off`}`,
    chargeability: 'Chargeability',
    chargeabilityCell: (month: string, chargeable: string, available: string) =>
      `${month}: ${chargeable}/${available} d`,
    chargeabilityHint: 'Chargeable ÷ (working days − out of office − neutral)',
    target: (percent: number) => `Target ${percent}%`,
    emptyYear: (year: number) =>
      `No orders run in ${year}. Add orders to your projects, or pick another year at the top.`,
  },

  year: {
    title: 'My year',
    /** The name of the calendar for screen readers; it isn't shown. */
    calendarTitle: (year: number) => `Calendar ${year}`,
    openMonth: (month: string) => `Timesheet ${month}`,
    /** The title of a day: its date and what it holds, joined with a middle dot. */
    day: (parts: string[]) => parts.join(' · '),
    dayWeekend: 'Weekend',
    dayFree: 'Nothing booked',
    dayHoliday: (name: string) => `${name} (holiday)`,
    dayEntry: (name: string, days: string) => `${name} ${days}`,
    dayToday: (text: string) => `${text} (today)`,
  },

  timesheet: {
    title: 'My timesheet',
    previousMonth: (month: string) => `Previous: ${month}`,
    nextMonth: (month: string) => `Next: ${month}`,
    thisMonth: 'This month',
    tableLabel: (month: string) => `Timesheet, ${month}`,
    columns: {
      day: 'Day',
      hours: 'Hours',
      order: 'Project · order',
      location: 'Location',
      notes: 'Notes',
      total: 'Total',
      forecast: 'Forecast',
      remaining: 'Remaining',
    },
    totalHint: (month: string) => `Booked in ${month} so far`,
    forecastHint: (month: string) => `Forecast ${month}`,
    remainingHint: 'Budget − booked so far',
    /** The names of a row's fields for screen readers: "Hours, Tue, Nov 3". */
    hoursLabel: (day: string) => `Hours, ${day}`,
    orderLabel: (day: string) => `Project and order, ${day}`,
    locationLabel: (day: string) => `Location, ${day}`,
    noteLabel: (day: string) => `Notes, ${day}`,
    /** The note button of a day: its tooltip shows the note, or this without one. */
    addNote: 'Add note',
    /** The title of the note dialog: "Note · Tue, Nov 3". */
    noteTitle: (day: string) => `Note · ${day}`,
    /** The rendered note, which opens its text on a click. */
    editNote: (day: string) => `Write the note of ${day}`,
    writeNote: 'Click here to write a note.',
    noNote: 'No note.',
    chooseOrder: 'Choose order',
    /** The order list of a day on which no order of an active project runs. */
    noOrders: 'No order runs on this day.',
    addEntry: (day: string) => `Add entry, ${day}`,
    addEntryBlocked: 'Fill the empty row',
    removeEntry: (day: string) => `Delete entry, ${day}`,
    /** The title of a day with more than 8 hours booked. */
    dayHours: (hours: string) => `${hours} booked`,
    monthSum: 'Σ',
    monthSumHint: (month: string) => `Totals for ${month}`,
    lockMonth: 'Lock month',
    lockHint: (month: string) => `Lock ${month}`,
    unlockHint: (month: string) => `Unlock ${month}`,
    lockedCell: 'Locked',
    emptyBefore: 'There are no orders yet. Add orders to your projects in ',
    emptyLink: 'My projects',
    emptyAfter: '.',
  },

  projectEdit: {
    pageTitleNew: 'New project',
    pageTitleEdit: 'Edit project',
    back: 'My projects',
    newTitle: 'New project',
    notFoundTitle: 'Project not found',
    notFoundBefore: 'This project doesn’t exist anymore. Go back to ',
    notFoundLink: 'My projects',
    notFoundAfter: ' to pick another one.',
    delete: 'Delete project',
    deleteBlocked: 'Has bookings',
    keep: 'Keep project',
    add: 'Add project',
    save: 'Save changes',

    details: 'Project details',
    name: 'Project name',
    customer: 'Account',
    chooseCustomer: 'Choose an account',
    status: 'Status',
    billing: 'Billing',
    booking: 'Booking',
    /** The one place an open-booking project is worked at by default (it has no orders). */
    defaultLocation: 'Default work location',
    color: 'Color',
    customColor: (hex: string) => `Custom color ${hex}`,
    removeCustomColor: (hex: string) => `Remove ${hex}`,
    addCustomColor: 'Add custom color',
    nameRequired: 'Enter the name of the project.',
    nameTaken: (name: string, customer: string) =>
      `${customer} already has a project named ${name}.`,
    customerRequired: 'Choose the account of this project.',

    orders: 'Orders',
    ordersTable: 'Orders of this project',
    columns: {
      name: 'Order',
      start: 'Start',
      end: 'End',
      location: 'Location',
      budget: 'Budget (days)',
    },
    newOrder: (n: number) => `Order ${n}`,
    orderName: (n: number) => `Order ${n} name`,
    orderStart: (name: string) => `Start of ${name}`,
    orderEnd: (name: string) => `End of ${name}`,
    orderLocation: (name: string) => `Location of ${name}`,
    orderBudget: (name: string) => `Budget of ${name}`,
    removeOrder: (name: string) => `Remove ${name}`,
    removeOrderBlocked: (name: string) => `${name} has bookings`,
    addOrder: 'Add order',
    noOrders: 'No orders yet. Add one to give the project a budget and a timeline.',
    ordersSummary: (orders: string, budget: string, range: string) =>
      `${orders} · ${budget} budget · ${range}`,
    orderErrors: {
      name: (n: number) => `Order ${n}: enter a name.`,
      dates: (name: string) => `${name}: enter a start and an end date.`,
      endBeforeStart: (name: string) => `${name}: the end date is before the start date.`,
      budget: (name: string) => `${name}: enter the budget in days, such as 12 or 0.5.`,
    },
  },

  customers: {
    tableLabel: 'Accounts',
    column: 'Account',
    empty: 'No accounts yet',
    add: 'Add account',
    newCustomer: 'New account',
    edit: (name: string) => `Edit ${name}`,
    moveUp: (name: string) => `Move ${name} up`,
    moveDown: (name: string) => `Move ${name} down`,
  },

  customerEdit: {
    pageTitleNew: 'New account',
    pageTitleEdit: 'Edit account',
    back: 'My accounts',
    newTitle: 'New account',
    notFoundTitle: 'Account not found',
    notFoundBefore: 'This account doesn’t exist anymore. Go back to ',
    notFoundLink: 'My accounts',
    notFoundAfter: ' to pick another one.',
    delete: 'Delete account',
    deleteBlocked: 'Has projects',
    keep: 'Keep account',
    add: 'Add account',
    save: 'Save changes',
    details: 'Account details',
    name: 'Name',
    nameRequired: 'Enter the name of the account.',
    nameTaken: (name: string) => `You already have an account named ${name}.`,
    logo: 'Logo',
    uploadLogo: 'Upload logo',
    importLogo: 'Import from website',
    replaceLogo: 'Replace logo',
    removeLogo: 'Remove logo',
    dropHint: 'Drag an image file into this box, or upload one.',
    logoErrors: {
      type: 'Choose an SVG, PNG or JPEG file.',
      size: 'This file is larger than 1 MB. Choose a smaller one.',
      notSvg: 'This file is not an SVG image.',
      unreadable: 'This file could not be read.',
    },
  },

  /** The dialog that takes a customer's logo from its website. */
  logoImport: {
    title: 'Import logo from website',
    intro:
      'Enter the address of the account’s website. ProTrack asks the icon service icon.horse for the site’s app icon or favicon, so icon.horse sees this address.',
    website: 'Website',
    placeholder: 'reply.com',
    find: 'Find icon',
    finding: 'Looking for the icon…',
    previewHint:
      'If you see a letter instead of the logo, the site has no icon. Try another address or upload the logo.',
    size: (width: number, height: number) => `${width} × ${height} px`,
    smallIcon: 'Only a small favicon: it may look blurry. Upload the logo for a sharper one.',
    use: 'Use as logo',
    close: 'Close',
    errors: {
      address: 'Enter a web address, such as reply.com.',
      unreachable:
        'No icon could be loaded for this address. Check it and your connection, or upload the logo instead.',
    },
  },

  settings: {
    title: 'Settings',

    language: 'Language',
    regionTitle: 'Region',
    federalState: 'Federal state',
    notSet: 'Not set',
    regionHintNotSet:
      'Pick your federal state to take its public holidays out of your working days. Until then, only the nationwide holidays count.',
    yearEnd: 'December 24 and 31',
    /** The choices for December 24 and 31, by percent off. */
    yearEndChoices: { 0: 'Working days', 50: 'Half days off', 100: 'Days off' } as Record<
      number,
      string
    >,

    targetsTitle: 'Targets',
    chargeability: 'Chargeability',
    locationsTitle: 'Booked days per location',

    backupTitle: 'Backup file',
    backupUnsupported:
      'Your browser can’t keep a backup file. Open ProTrack in Chrome or Edge, or export your data regularly.',
    backupIntro:
      'Pick a file, for example in a folder that syncs to the cloud. ProTrack saves your data to it after every change. To take your data to another machine, open the same file there.',
    createBackup: 'Create backup file',
    openBackup: 'Open backup file',
    savesToBefore: 'ProTrack saves your data to ',
    savesToAfter: ' after every change.',
    lastSaved: (dateTime: string) => `Last saved ${dateTime}.`,
    pausedHint: 'Your browser asks for access again after a restart. Resume to save your changes.',
    pending: (savedAt: string, customers: string) =>
      ` holds other data, saved ${savedAt} · ${customers}. Load it to replace the data on this device, or overwrite the file with the data on this device.`,
    conflict: (savedAt: string, customers: string) =>
      `The file was saved on another device ${savedAt} · ${customers}. Load its data to replace the data on this device, or overwrite it with the data on this device.`,
    loadFromFile: 'Load from file',
    overwriteFile: 'Overwrite file',
    resume: 'Resume backups',
    saveNow: 'Save now',
    unlink: 'Unlink file',
    backupErrors: {
      needsPermission: 'ProTrack needs your permission to write to this file.',
      gone: 'The backup file is gone. Choose it again or create a new one.',
      notAllowed: 'ProTrack may not write to the backup file.',
      writeFailed: 'The backup file could not be written.',
      unknown: 'Something went wrong.',
    },

    /** Copies of all data on this device, to undo a mistake. */
    snapshots: {
      title: 'Restore points',
      intro: (max: number) =>
        `ProTrack keeps a copy of your data on this device once a day, and before an import, a load from the backup file, a restore or deleting an account or project. The last ${max} are kept. They stay on this device and are not in your backup file.`,
      none: 'No restore points yet. The first one is taken once you have data.',
      reasons: {
        daily: 'Daily',
        import: 'Before an import',
        backupLoad: 'Before loading the backup file',
        restore: 'Before a restore',
        deleteProject: (name: string) =>
          name ? `Before deleting ${name}` : 'Before deleting a project',
        deleteCustomer: (name: string) =>
          name ? `Before deleting ${name}` : 'Before deleting an account',
      },
      counts: (customers: string, projects: string, bookings: number) =>
        `${customers}, ${projects}, ${bookings === 1 ? '1 booking' : `${bookings} bookings`}`,
      restore: 'Restore',
      confirm: (date: string, withBackup: boolean) =>
        `Restoring replaces all data on this device${withBackup ? ' and in your backup file' : ''} with the data of ${date}. Your current data gets a restore point first, so you can go back.`,
      restored: (date: string) => `The data of ${date} was restored.`,
      download: (date: string) => `Download ${date}`,
      showAll: (n: number) => (n === 1 ? 'Show 1 more' : `Show ${n} more`),
      gone: 'This restore point is gone.',
    },

    transferTitle: 'Import and export',
    transferIntro:
      'Export saves all your data as a JSON file. Import reads such a file and replaces all data on this device.',
    exportData: 'Export data',
    importData: 'Import data',
    importPending: (savedAt: string, customers: string, withBackup: boolean) =>
      ` · saved ${savedAt} · ${customers}. Importing replaces all data on this device${withBackup ? ' and in your backup file' : ''}.`,
    replaceData: 'Replace my data',
    imported: 'Your data was imported.',

    resetTitle: 'Reset',
    resetIntro: 'Deletes all data on this device and starts over with an empty ProTrack.',
    resetWarning: 'This deletes all accounts, projects and settings on this device for good.',
    resetKeepsBackup: (file: string) => `Your backup file ${file} stays as it is and is unlinked.`,
    resetExportFirst: 'Export your data first if you might need it again.',
    deleteAll: 'Delete all data',
    deleteEverything: 'Delete everything',
    resetDone: 'All data was deleted.',
  },

  /** Problems with a sync file, for import, backup and export. */
  syncFileErrors: {
    notJson: 'This file is not valid JSON.',
    notProtrack: 'This file is not a ProTrack file.',
    noVersion: 'This file has no valid schema version.',
    newerVersion: 'This file comes from a newer version of ProTrack. Update the app first.',
  },
};
