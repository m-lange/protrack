import { Dropdown, Option, Text, Title3, makeStyles, tokens } from '@fluentui/react-components';
import { DashboardCard } from '../dashboard/DashboardCard';
import { BUNDESLAENDER, BUNDESLAND_LABELS, isBundesland } from '../../types/bundesland';
import type { YearSettings } from '../../types/yearSettings';

const useStyles = makeStyles({
  card: {
    alignSelf: 'stretch',
    width: '280px',
    boxSizing: 'border-box',
    gap: tokens.spacingVerticalM,
  },
  inheritedHint: {
    color: tokens.colorNeutralForeground3,
  },
});

interface BundeslandSectionProps {
  settings: YearSettings;
  inheritedFromYear: number | null;
  onChange: (settings: YearSettings) => void;
}

export function BundeslandSection({ settings, inheritedFromYear, onChange }: BundeslandSectionProps) {
  const styles = useStyles();

  return (
    <DashboardCard className={styles.card}>
      <Title3>Bundesland</Title3>
      {inheritedFromYear !== null && (
        <Text className={styles.inheritedHint}>Übernommen von {inheritedFromYear}</Text>
      )}

      <Dropdown
        aria-label="Bundesland"
        value={BUNDESLAND_LABELS[settings.bundesland]}
        selectedOptions={[settings.bundesland]}
        onOptionSelect={(_event, data) => {
          if (isBundesland(data.optionValue)) {
            onChange({ ...settings, bundesland: data.optionValue });
          }
        }}
      >
        {BUNDESLAENDER.map((b) => (
          <Option key={b} value={b}>
            {BUNDESLAND_LABELS[b]}
          </Option>
        ))}
      </Dropdown>
    </DashboardCard>
  );
}
