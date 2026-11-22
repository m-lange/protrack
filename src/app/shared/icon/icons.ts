/**
 * Every icon the app uses, one SVG file each in src/icons/: Streamline Ultimate Regular
 * (streamlinehq.com, set "streamline-regular"), except the logo, loc-reply (the logo's running
 * figure, filled) and the Harvey balls (harvey-0/50/100). To change an icon, replace its
 * file; to add one, drop the file there and list it here. Colors in the files don't matter:
 * app-icon draws every stroke and fill in currentColor and sets the size.
 */
import alert from '../../../icons/alert.svg';
import archive from '../../../icons/archive.svg';
import check from '../../../icons/check.svg';
import chevronDown from '../../../icons/chevron-down.svg';
import chevronLeft from '../../../icons/chevron-left.svg';
import chevronRight from '../../../icons/chevron-right.svg';
import chevronUp from '../../../icons/chevron-up.svg';
import close from '../../../icons/close.svg';
import copy from '../../../icons/copy.svg';
import customer from '../../../icons/customer.svg';
import download from '../../../icons/download.svg';
import edit from '../../../icons/edit.svg';
import forecast from '../../../icons/forecast.svg';
import harvey0 from '../../../icons/harvey-0.svg';
import harvey50 from '../../../icons/harvey-50.svg';
import harvey100 from '../../../icons/harvey-100.svg';
import home from '../../../icons/home.svg';
import locHome from '../../../icons/loc-home.svg';
import locOnsite from '../../../icons/loc-onsite.svg';
import locOoo from '../../../icons/loc-ooo.svg';
import locReply from '../../../icons/loc-reply.svg';
import lock from '../../../icons/lock.svg';
import logo from '../../../icons/logo.svg';
import note from '../../../icons/note.svg';
import plus from '../../../icons/plus.svg';
import projects from '../../../icons/projects.svg';
import refresh from '../../../icons/refresh.svg';
import restore from '../../../icons/restore.svg';
import save from '../../../icons/save.svg';
import settings from '../../../icons/settings.svg';
import sidebarExpand from '../../../icons/sidebar-expand.svg';
import timesheet from '../../../icons/timesheet.svg';
import trash from '../../../icons/trash.svg';
import unlink from '../../../icons/unlink.svg';
import unlock from '../../../icons/unlock.svg';
import upload from '../../../icons/upload.svg';
import year from '../../../icons/year.svg';

export const ICONS = {
  alert,
  archive,
  check,
  'chevron-down': chevronDown,
  'chevron-left': chevronLeft,
  'chevron-right': chevronRight,
  'chevron-up': chevronUp,
  close,
  copy,
  customer,
  download,
  edit,
  forecast,
  // Harvey balls, drawn for ProTrack (not in Streamline): how much of a day is off.
  'harvey-0': harvey0,
  'harvey-50': harvey50,
  'harvey-100': harvey100,
  home,
  'loc-home': locHome,
  'loc-onsite': locOnsite,
  'loc-ooo': locOoo,
  'loc-reply': locReply,
  lock,
  logo,
  note,
  plus,
  projects,
  refresh,
  restore,
  save,
  settings,
  'sidebar-expand': sidebarExpand,
  timesheet,
  trash,
  unlink,
  unlock,
  upload,
  year,
} satisfies Record<string, string>;

export type IconName = keyof typeof ICONS;
