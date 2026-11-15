// Mesmas regras de CadastrarUsuario e NomeUsuario no projeto-si-backend.
export const USERNAME_PATTERN = /^[a-z0-9._@+-]{3,50}$/;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

export const USERNAME_RULE_MESSAGE =
  'O usuário deve ter entre 3 e 50 caracteres, usando letras sem acento, números ou . _ @ + -';
export const PASSWORD_LENGTH_MESSAGE = `A senha deve ter entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH} caracteres.`;
export const PASSWORD_DEAD_KEY_MESSAGE =
  'A senha não pode conter letras acentuadas nem os acentos ´ ` ~ ^ ¨ (o ç é permitido).';

// Esses caracteres dependem de teclas mortas, que geram eventos 'Dead' e impedem a captura de KEY_DOWN/KEY_UP.
const DEAD_KEY_SYMBOLS = ['´', '`', '~', '^', '¨'];
const ALLOWED_DECOMPOSABLE_LETTERS = ['ç', 'Ç'];

export function containsDeadKeyCharacter(password: string): boolean {
  return [...password].some(
    (character) =>
      DEAD_KEY_SYMBOLS.includes(character) ||
      (!ALLOWED_DECOMPOSABLE_LETTERS.includes(character) && character.normalize('NFD') !== character)
  );
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username.trim().toLowerCase());
}

export function isPasswordLengthValid(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;
}
