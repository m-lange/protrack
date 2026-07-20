import { Field, Input, Text, Title3, makeStyles, tokens } from '@fluentui/react-components';
import { DashboardCard } from '../dashboard/DashboardCard';
import type { YearSettings } from '../../types/yearSettings';

const useStyles = makeStyles({
  card: {
    alignSelf: 'stretch',
    width: '380px',
    boxSizing: 'border-box',
    gap: tokens.spacingVerticalM,
  },
  inheritedHint: {
    color: tokens.colorNeutralForeground3,
  },
  // `Field`'s horizontal orientation defaults to a 33%/1fr split with a tight gap.
  // Widen the label column, cap the input at ~1/3 width, and add more breathing room between them.
  field: {
    gridTemplateColumns: '1fr 33%',
    columnGap: tokens.spacingHorizontalXXXL,
  },
});

interface TargetsSectionProps {
  settings: YearSettings;
  inheritedFromYear: number | null;
  onChange: (settings: YearSettings) => void;
}

export function TargetsSection({ settings, inheritedFromYear, onChange }: TargetsSectionProps) {
  const styles = useStyles();

  return (
    <DashboardCard className={styles.card}>
      <Title3>Ziele</Title3>
      {inheritedFromYear !== null && (
        <Text className={styles.inheritedHint}>Übernommen von {inheritedFromYear}</Text>
      )}

      <Field className={styles.field} label="Chargeability (%)" orientation="horizontal">
        <Input
          type="number"
          min={0}
          max={100}
          value={String(settings.targetChargeability)}
          onChange={(_event, data) => onChange({ ...settings, targetChargeability: Number(data.value) || 0 })}
        />
      </Field>
      <Field className={styles.field} label="Kunde (%)" orientation="horizontal">
        <Input
          type="number"
          min={0}
          max={100}
          value={String(settings.targetKunde)}
          onChange={(_event, data) => onChange({ ...settings, targetKunde: Number(data.value) || 0 })}
        />
      </Field>
      <Field className={styles.field} label="Büro (%)" orientation="horizontal">
        <Input
          type="number"
          min={0}
          max={100}
          value={String(settings.targetBuero)}
          onChange={(_event, data) => onChange({ ...settings, targetBuero: Number(data.value) || 0 })}
        />
      </Field>
      <Field className={styles.field} label="Abrechenbare Tage" orientation="horizontal">
        <Input
          type="number"
          min={0}
          value={String(settings.targetChargeableDays)}
          onChange={(_event, data) => onChange({ ...settings, targetChargeableDays: Number(data.value) || 0 })}
        />
      </Field>
    </DashboardCard>
  );
}
