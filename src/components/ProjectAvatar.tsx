import { useMemo, type CSSProperties } from 'react';
import { Avatar, makeStyles, mergeClasses, tokens, type AvatarProps } from '@fluentui/react-components';
import type { Project } from '../types/project';

/** Custom property carrying the per-project color down to the nested-selector rules below - the
 * `image`/`initials` slot *shorthand* props (`image={{ style: {...} }}`) look like they should let
 * us set backgroundColor/color per-instance, but Avatar's `useAvatar_unstable` recomputes those
 * slots from the raw shorthand a second time after the base hook already resolved them, and the
 * `style` sub-property doesn't survive that (confirmed via DOM inspection - no `style` attribute
 * ever reaches the actual `<span>`/`<img>`). A CSS variable set on the root inherits down to the
 * slots regardless, sidestepping the bug entirely. */
type AvatarColorVars = CSSProperties & { '--project-avatar-color'?: string };

const useStyles = makeStyles({
  // `outline`, not `border` - this app has a global `* { box-sizing: border-box }` reset
  // (src/index.css), so a `border` on the root would eat into the content box that the
  // Fluent-internal image/initials layers size themselves at 100% against, visibly shrinking
  // the image/initials inside a couple px on every avatar. `outline` paints outside the box
  // model entirely (and still follows `border-radius` in all current browsers) - same fix
  // already used for ring effects around small circular elements, see the griffel-gotchas memory.
  // `.fui-Avatar__initials`/`.fui-Avatar__image` are Fluent's own public, stable CSS hook classes
  // (see `avatarClassNames` in `@fluentui/react-avatar`) - targeting them here is the supported
  // way to reach into those slots, same idea as the Button icon-slot `'& svg'` gotcha.
  root: {
    outlineStyle: 'solid',
    outlineWidth: '1px',
    outlineColor: 'transparent',
    borderRadius: tokens.borderRadiusCircular,
    // Backstops the initials/image slot below - those are separately-rasterized child elements,
    // and even at identical geometry and color a browser can leave a sub-pixel antialiasing seam
    // where they meet the root's own outline ring, letting the page background show through as a
    // hairline. Painting the same color here too means any such gap shows color-on-color instead.
    backgroundColor: 'var(--project-avatar-color)',
    '& .fui-Avatar__initials': {
      backgroundColor: 'var(--project-avatar-color)',
      color: '#FFFFFF',
      // Fluent's own initials slot draws a thin `colorTransparentStroke` border by default -
      // normally invisible, but it sits directly inside our outline ring and shows through as a
      // hairline seam of the page background between the two. Matching it to our own fill color
      // makes it blend away instead. Full `border` shorthand (not just `borderColor`) - Griffel
      // rejects a color-only override of a property the base class already sets as a shorthand
      // (see the griffel-gotchas memory).
      border: `${tokens.strokeWidthThin} solid var(--project-avatar-color)`,
    },
    '& .fui-Avatar__icon': {
      backgroundColor: 'var(--project-avatar-color)',
      color: '#FFFFFF',
      border: `${tokens.strokeWidthThin} solid var(--project-avatar-color)`,
    },
    '& .fui-Avatar__image': {
      backgroundColor: 'var(--project-avatar-color)',
    },
  },
  svgHost: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: tokens.borderRadiusCircular,
    outlineStyle: 'solid',
    outlineWidth: '1px',
    outlineColor: 'transparent',
  },
  svgInner: {
    display: 'flex',
    // Fills the circle edge-to-edge, same as a raster image's `object-fit: cover` - no imposed
    // padding, so an SVG logo reads at the same size as any other image in this avatar.
    width: '100%',
    height: '100%',
    '& svg': {
      width: '100%',
      height: '100%',
    },
  },
});

/** Decodes a `data:image/svg+xml[;charset=...][;base64],...` URL into raw markup, or `null` if it isn't one / can't be decoded. */
function decodeSvgDataUrl(src: string): string | null {
  const match = /^data:image\/svg\+xml(?:;charset=[^;,]+)?(;base64)?,(.*)$/su.exec(src);
  if (!match) return null;
  const [, isBase64, payload] = match;
  try {
    if (isBase64) {
      const binary = atob(payload);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    }
    return decodeURIComponent(payload);
  } catch {
    return null;
  }
}

/** Strips `<script>` tags and inline event-handler attributes before inlining user-supplied SVG markup. */
function sanitizeSvgMarkup(markup: string): string {
  return markup.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, '');
}

interface ProjectAvatarProps {
  project: Project;
  size?: AvatarProps['size'];
  className?: string;
  title?: string;
}

/**
 * A project's avatar: always filled with the project's own color as background (so a
 * transparent-background logo or the initials fallback both read clearly), ringed in that same
 * plain (non-darkened) color. SVG logos that draw with `currentColor` render it white against
 * that background; raster images and the initials fallback get white via inline overrides
 * instead, since `<img>`-embedded SVGs are isolated documents that `currentColor` can't reach.
 * Uploaded exclusively via `ProjectDialog`'s local file picker (never remote/shared input), so
 * inlining SVG markup here is safe - still stripped of `<script>`/event-handler attributes as
 * defense-in-depth.
 */
export function ProjectAvatar({ project, size = 24, className, title }: ProjectAvatarProps) {
  const styles = useStyles();
  const svgMarkup = useMemo(() => {
    if (!project.image?.startsWith('data:image/svg+xml')) return null;
    const decoded = decodeSvgDataUrl(project.image);
    return decoded ? sanitizeSvgMarkup(decoded) : null;
  }, [project.image]);

  const resolvedTitle = title ?? project.name ?? undefined;

  if (svgMarkup) {
    return (
      <span
        className={mergeClasses(styles.svgHost, className)}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: project.color,
          outlineColor: project.color,
          color: '#FFFFFF',
        }}
        role="img"
        aria-label={resolvedTitle}
        title={resolvedTitle}
      >
        <span className={styles.svgInner} dangerouslySetInnerHTML={{ __html: svgMarkup }} />
      </span>
    );
  }

  const avatarStyle: AvatarColorVars = {
    outlineColor: project.color,
    '--project-avatar-color': project.color,
  };

  return (
    <Avatar
      className={mergeClasses(styles.root, className)}
      style={avatarStyle}
      image={project.image ? { src: project.image } : undefined}
      name={project.name || undefined}
      size={size}
      title={resolvedTitle}
    />
  );
}
