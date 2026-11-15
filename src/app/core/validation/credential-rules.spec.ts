import {
  PASSWORD_LENGTH_MESSAGE,
  containsDeadKeyCharacter,
  isPasswordLengthValid,
  isValidUsername
} from './credential-rules';

describe('credential-rules', () => {
  describe('containsDeadKeyCharacter', () => {
    it('deve detectar letras acentuadas e acentos isolados', () => {
      expect(containsDeadKeyCharacter('á')).toBeTrue();
      expect(containsDeadKeyCharacter('Ê')).toBeTrue();
      expect(containsDeadKeyCharacter('ü')).toBeTrue();
      expect(containsDeadKeyCharacter('~')).toBeTrue();
    });

    it('deve liberar ç, letras sem acento, números e símbolos comuns', () => {
      expect(containsDeadKeyCharacter('çÇ')).toBeFalse();
      expect(containsDeadKeyCharacter('.tie5Roanl')).toBeFalse();
      expect(containsDeadKeyCharacter(`!@#$%&*()-_=+[]{};:'",<.>/?\\|`)).toBeFalse();
    });
  });

  describe('isValidUsername', () => {
    it('deve aceitar usuários no padrão do backend, após remover espaços e converter para minúsculas', () => {
      expect(isValidUsername('abc')).toBeTrue();
      expect(isValidUsername('  Julia.Vital@ufabc+1  ')).toBeTrue();
      expect(isValidUsername('a'.repeat(50))).toBeTrue();
    });

    it('deve recusar usuários curtos, longos, com acento, espaço interno ou símbolos não permitidos', () => {
      for (const invalid of ['ab', 'a'.repeat(51), 'joão', 'nome com espaço', 'user#1', '']) {
        expect(isValidUsername(invalid)).withContext(invalid).toBeFalse();
      }
    });
  });

  describe('isPasswordLengthValid', () => {
    it('deve aceitar de 8 a 64 caracteres', () => {
      expect(isPasswordLengthValid('a'.repeat(8))).toBeTrue();
      expect(isPasswordLengthValid('a'.repeat(64))).toBeTrue();
      expect(isPasswordLengthValid('a'.repeat(7))).toBeFalse();
      expect(isPasswordLengthValid('a'.repeat(65))).toBeFalse();
      expect(PASSWORD_LENGTH_MESSAGE).toBe('A senha deve ter entre 8 e 64 caracteres.');
    });
  });
});
