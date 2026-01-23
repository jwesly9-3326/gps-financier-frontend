/**
 * Fonctions de validation
 */

export const isValidEmail = (email) => {
  return /\S+@\S+\.\S+/.test(email);
};

export const isValidPassword = (password) => {
  return password.length >= 8;
};

export const isValidNumber = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};