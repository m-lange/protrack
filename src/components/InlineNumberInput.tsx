import { useEffect, useState } from 'react';
import { Input, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  input: {
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    backgroundColor: 'transparent',
    borderRadius: tokens.borderRadiusSmall,
    '& input': {
      textAlign: 'center',
      color: tokens.colorNeutralForeground2,
    },
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  // Sums, "--" placeholders, and out-of-period fields aren't editable, so they shouldn't
  // carry the underline affordance of an actual input - only a real editable field should.
  nonInteractive: {
    cursor: 'default',
    borderBottomStyle: 'none',
    ':hover': {
      backgroundColor: 'transparent',
    },
  },
  // Editable forecast cells get an accent tint so they read as "active" at a glance,
  // distinct from read-only sums, disabled out-of-period cells, and "--" placeholders.
  active: {
    backgroundColor: `color-mix(in srgb, ${tokens.colorBrandBackground} 22%, ${tokens.colorNeutralBackground1})`,
    ':hover': {
      backgroundColor: `color-mix(in srgb, ${tokens.colorBrandBackground} 34%, ${tokens.colorNeutralBackground1})`,
    },
  },
  overBudget: {
    '& input': {
      color: tokens.colorPaletteRedForeground2,
      fontWeight: tokens.fontWeightBold,
    },
  },
  // Zero values and disabled/unavailable fields fade into the background so real entries stand out.
  inactive: {
    '& input': {
      color: tokens.colorNeutralForeground4,
    },
  },
});

function formatNumber(value: number): string {
  return value.toFixed(1);
}

function parseDecimal(text: string): number {
  const normalized = text.replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Math.round(parseFloat(normalized || '0') * 10) / 10;
  return Number.isFinite(parsed) ? parsed : 0;
}

interface InlineNumberInputProps {
  value: number;
  onCommit?: (value: number) => void;
  highlight?: boolean;
  /** Field currently can't be edited (e.g. a month outside the contingent's period). */
  disabled?: boolean;
  /** Value is a derived total, never directly editable. */
  readOnly?: boolean;
  /** Nothing to show (no fixed contingent) - renders "--" instead of a value. */
  unavailable?: boolean;
}

/**
 * Renders every numeric cell in the Projekte table (editable, read-only sum, disabled, or
 * "--"/unavailable) through the same Input markup, so alignment across rows never depends on
 * matching padding by hand.
 */
export function InlineNumberInput({ value, onCommit, highlight, disabled, readOnly, unavailable }: InlineNumberInputProps) {
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => (value === 0 ? '' : String(value)));

  useEffect(() => {
    if (!focused) {
      setText(value === 0 ? '' : String(value));
    }
  }, [value, focused]);

  const editable = !disabled && !readOnly && !unavailable;
  const faded = disabled || unavailable || value === 0;

  if (!editable) {
    return (
      <Input
        appearance="underline"
        className={mergeClasses(styles.input, styles.nonInteractive, faded && styles.inactive, highlight && styles.overBudget)}
        style={{ borderBottomStyle: 'none' }}
        type="text"
        value={unavailable ? '--' : formatNumber(value)}
        disabled
        tabIndex={-1}
      />
    );
  }

  return (
    <Input
      appearance="underline"
      className={mergeClasses(styles.input, styles.active, faded && styles.inactive, highlight && styles.overBudget)}
      type="text"
      inputMode="decimal"
      value={focused ? text : formatNumber(value)}
      onFocus={() => {
        setFocused(true);
        setText(value === 0 ? '' : String(value));
      }}
      onChange={(_event, data) => setText(data.value)}
      onBlur={() => {
        setFocused(false);
        const parsed = parseDecimal(text);
        if (parsed !== value) {
          onCommit?.(parsed);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
    />
  );
}
