import type { MouseEventHandler, ReactNode } from 'react';
import { Avatar, Text, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { readableTextColor } from '../utils/color';
import type { Project } from '../types/project';

const useStyles = makeStyles({
  chip: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    borderRadius: tokens.borderRadiusSmall,
    paddingInline: tokens.spacingHorizontalXS,
    paddingBlock: '4px',
    gap: tokens.spacingHorizontalS,
  },
  avatar: {
    flexShrink: 0,
    border: '1px solid transparent',
    borderRadius: tokens.borderRadiusCircular,
  },
  label: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

interface ProjectChipProps {
  project: Project;
  avatarSize?: 16 | 20 | 24;
  className?: string;
  children?: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  title?: string;
}

/** The colored avatar+name pill shared by assigned-project tags and the project-picker menu. */
export function ProjectChip({ project, avatarSize = 16, className, children, ...handlers }: ProjectChipProps) {
  const styles = useStyles();
  const textColor = readableTextColor(project.color);

  return (
    <div className={mergeClasses(styles.chip, className)} style={{ backgroundColor: project.color, color: textColor }} {...handlers}>
      <Avatar
        className={styles.avatar}
        style={{ borderColor: textColor }}
        image={project.image ? { src: project.image } : undefined}
        name={project.name || undefined}
        size={avatarSize}
      />
      <Text size={100} weight="semibold" className={styles.label} style={{ color: textColor }}>
        {project.name}
      </Text>
      {children}
    </div>
  );
}
