import { initialsOf } from './customer-badge';

describe('initialsOf', () => {
  it('takes the first letters of two words, or two letters of one', () => {
    expect(initialsOf('Silberbach Bank')).toBe('SB');
    expect(initialsOf('kranich logistik gmbh')).toBe('KL');
    expect(initialsOf('Brennwald')).toBe('BR');
    expect(initialsOf('  ')).toBe('');
  });
});
