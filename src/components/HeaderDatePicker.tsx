import { useEffect, useState, type ReactElement } from 'react';
import { Button, Popover, PopoverSurface, PopoverTrigger, Text, makeStyles, tokens } from '@fluentui/react-components';
import { ChevronLeft16Regular, ChevronRight16Regular } from '@fluentui/react-icons';
import { MONTH_NAMES } from '../utils/calendarGrid';

const YEARS_PER_PAGE = 12;

const useStyles = makeStyles({
  surface: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    width: '280px',
    boxSizing: 'border-box',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    minWidth: 'unset',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: tokens.spacingHorizontalXS,
  },
  gridButton: {
    minWidth: 'unset',
    width: '100%',
    boxSizing: 'border-box',
    paddingInline: tokens.spacingHorizontalXS,
  },
});

interface YearPickerProps {
  mode: 'year';
  year: number;
  onSelectYear: (year: number) => void;
  children: ReactElement;
}

interface MonthPickerProps {
  mode: 'month';
  year: number;
  month1to12: number;
  onSelectMonth: (year: number, month1to12: number) => void;
  children: ReactElement;
}

type HeaderDatePickerProps = YearPickerProps | MonthPickerProps;

/** Popover-based year (or year+month) picker that closes itself as soon as a value is picked. */
export function HeaderDatePicker(props: HeaderDatePickerProps) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [pageStart, setPageStart] = useState(props.year - Math.floor(YEARS_PER_PAGE / 2));
  const [pickerYear, setPickerYear] = useState(props.year);

  useEffect(() => {
    if (open) {
      setPageStart(props.year - Math.floor(YEARS_PER_PAGE / 2));
      setPickerYear(props.year);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const years = Array.from({ length: YEARS_PER_PAGE }, (_, index) => pageStart + index);

  return (
    <Popover open={open} onOpenChange={(_event, data) => setOpen(data.open)} positioning="below">
      <PopoverTrigger disableButtonEnhancement>{props.children}</PopoverTrigger>
      <PopoverSurface className={styles.surface}>
        {props.mode === 'year' ? (
          <>
            <div className={styles.nav}>
              <Button
                appearance="subtle"
                className={styles.navButton}
                icon={<ChevronLeft16Regular />}
                onClick={() => setPageStart((p) => p - YEARS_PER_PAGE)}
                aria-label="Frühere Jahre"
              />
              <Text weight="semibold">
                {pageStart}–{pageStart + YEARS_PER_PAGE - 1}
              </Text>
              <Button
                appearance="subtle"
                className={styles.navButton}
                icon={<ChevronRight16Regular />}
                onClick={() => setPageStart((p) => p + YEARS_PER_PAGE)}
                aria-label="Spätere Jahre"
              />
            </div>
            <div className={styles.grid}>
              {years.map((y) => (
                <Button
                  key={y}
                  className={styles.gridButton}
                  appearance={y === props.year ? 'primary' : 'subtle'}
                  onClick={() => {
                    props.onSelectYear(y);
                    setOpen(false);
                  }}
                >
                  {y}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className={styles.nav}>
              <Button
                appearance="subtle"
                className={styles.navButton}
                icon={<ChevronLeft16Regular />}
                onClick={() => setPickerYear((y) => y - 1)}
                aria-label="Vorheriges Jahr"
              />
              <Text weight="semibold">{pickerYear}</Text>
              <Button
                appearance="subtle"
                className={styles.navButton}
                icon={<ChevronRight16Regular />}
                onClick={() => setPickerYear((y) => y + 1)}
                aria-label="Nächstes Jahr"
              />
            </div>
            <div className={styles.grid}>
              {MONTH_NAMES.map((name, index) => (
                <Button
                  key={name}
                  className={styles.gridButton}
                  appearance={pickerYear === props.year && index + 1 === props.month1to12 ? 'primary' : 'subtle'}
                  onClick={() => {
                    props.onSelectMonth(pickerYear, index + 1);
                    setOpen(false);
                  }}
                >
                  {name.slice(0, 3)}
                </Button>
              ))}
            </div>
          </>
        )}
      </PopoverSurface>
    </Popover>
  );
}
