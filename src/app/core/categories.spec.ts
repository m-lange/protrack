import { BILLING, LOCATIONS, category, projectColor } from './categories';

describe('categories', () => {
  it('lists the locations as on-site, Reply, home office, out of office', () => {
    expect(LOCATIONS.map((location) => location.id)).toEqual(['onsite', 'reply', 'home', 'ooo']);
  });

  it('finds a category by its id', () => {
    expect(category(BILLING, 'neutral').chip).toBe('pt-chip--neutral');
  });

  it('turns a preset into its token and keeps a custom color', () => {
    expect(projectColor('pink')).toBe('var(--project-pink)');
    expect(projectColor('#2F9E8F')).toBe('#2F9E8F');
  });

  it.each(['', 'teal', '#12345', '#1234567', 'red; background: url(https://example.com)'])(
    'falls back to the first preset for "%s", so no stored text reaches a style',
    (color) => {
      expect(projectColor(color)).toBe('var(--project-indigo)');
    },
  );
});
