/**
 * Fonctions de formatage
 */

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('fr-CA').format(new Date(date));
};

export const formatPercent = (value) => {
  return `${(value * 100).toFixed(2)}%`;
};