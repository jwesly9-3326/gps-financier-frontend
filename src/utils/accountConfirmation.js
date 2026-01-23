// 🧭 UTILITAIRES POUR LA CONFIRMATION DES COMPTES
// Permet de vérifier si un compte a été confirmé pour aujourd'hui
// Utilisé par GPS Financier pour éviter de recalculer les transactions confirmées

/**
 * Récupère la liste des comptes confirmés pour aujourd'hui
 * @returns {string[]} Liste des noms de comptes confirmés
 */
export const getConfirmedAccountsToday = () => {
  const todayKey = new Date().toISOString().split('T')[0];
  const storageKey = 'pl4to_confirmed_accounts';
  
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const confirmedData = JSON.parse(saved);
      return confirmedData[todayKey] || [];
    }
  } catch (e) {
    console.error('[AccountConfirmation] Erreur lecture:', e);
  }
  
  return [];
};

/**
 * Vérifie si un compte spécifique a été confirmé pour aujourd'hui
 * @param {string} accountName - Nom du compte à vérifier
 * @returns {boolean} True si le compte a été confirmé aujourd'hui
 */
export const isAccountConfirmedToday = (accountName) => {
  const confirmedAccounts = getConfirmedAccountsToday();
  return confirmedAccounts.includes(accountName);
};

/**
 * Marque un compte comme confirmé pour aujourd'hui
 * @param {string} accountName - Nom du compte à marquer
 */
export const markAccountAsConfirmed = (accountName) => {
  const todayKey = new Date().toISOString().split('T')[0];
  const storageKey = 'pl4to_confirmed_accounts';
  
  let confirmedData = {};
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      confirmedData = JSON.parse(saved);
    }
  } catch (e) {
    console.error('[AccountConfirmation] Erreur lecture:', e);
  }
  
  // Nettoyer les anciennes dates (garder seulement aujourd'hui)
  confirmedData = { [todayKey]: confirmedData[todayKey] || [] };
  
  // Ajouter le compte s'il n'est pas déjà dans la liste
  if (!confirmedData[todayKey].includes(accountName)) {
    confirmedData[todayKey].push(accountName);
  }
  
  localStorage.setItem(storageKey, JSON.stringify(confirmedData));
  console.log(`[AccountConfirmation] ${accountName} marqué comme confirmé pour ${todayKey}`);
};

/**
 * Efface tous les comptes confirmés (reset)
 */
export const clearConfirmedAccounts = () => {
  localStorage.removeItem('pl4to_confirmed_accounts');
  console.log('[AccountConfirmation] Tous les comptes confirmés ont été effacés');
};

export default {
  getConfirmedAccountsToday,
  isAccountConfirmedToday,
  markAccountAsConfirmed,
  clearConfirmedAccounts
};
