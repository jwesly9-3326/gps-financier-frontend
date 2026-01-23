/**
 * Données mockées pour le développement et tests
 */

// Mock User
export const mockUser = {
  id: 1,
  nom: 'Désir',
  prenom: 'Jhon',
  email: 'jhon@gpsfinancier.com',
  dateO: '2025-01-01',
  createdAt: '2025-01-01T00:00:00Z',
};

// Mock Comptes
export const mockComptes = [
  {
    id: 1,
    nom: 'Compte Chèques Principal',
    type: 'cheques',
    soldeInitial: 5000,
    soldeActuel: 5450.75,
    institution: 'Desjardins',
    couleur: '#4CAF50',
    actif: true,
  },
  {
    id: 2,
    nom: 'Épargne Vacances',
    type: 'epargne',
    soldeInitial: 2000,
    soldeActuel: 2350,
    institution: 'Desjardins',
    couleur: '#2196F3',
    actif: true,
  },
  {
    id: 3,
    nom: 'Carte de Crédit',
    type: 'credit',
    soldeInitial: 0,
    soldeActuel: -850,
    institution: 'RBC',
    limite: 5000,
    couleur: '#F44336',
    actif: true,
  },
];

// Mock Activités (Revenus et Dépenses)
export const mockActivites = [
  {
    id: 1,
    nom: 'Salaire',
    type: 'revenu',
    montant: 3500,
    frequence: 'bimensuel',
    dateDebut: '2025-01-15',
    compteId: 1,
    categorie: 'salaire',
    actif: true,
  },
  {
    id: 2,
    nom: 'Loyer',
    type: 'depense',
    montant: 1200,
    frequence: 'mensuel',
    dateDebut: '2025-01-01',
    compteId: 1,
    categorie: 'logement',
    actif: true,
  },
  {
    id: 3,
    nom: 'Épicerie',
    type: 'depense',
    montant: 400,
    frequence: 'mensuel',
    dateDebut: '2025-01-01',
    compteId: 1,
    categorie: 'alimentation',
    actif: true,
  },
  {
    id: 4,
    nom: 'Hydro-Québec',
    type: 'depense',
    montant: 85,
    frequence: 'mensuel',
    dateDebut: '2025-01-05',
    compteId: 1,
    categorie: 'services',
    actif: true,
  },
];

// Mock Objectifs
export const mockObjectifs = [
  {
    id: 1,
    nom: 'Voyage Europe',
    montantCible: 5000,
    montantActuel: 2350,
    dateDebut: '2025-01-01',
    dateCible: '2025-12-31',
    categorie: 'voyage',
    priorite: 'haute',
    statut: 'en_cours',
  },
  {
    id: 2,
    nom: 'Fonds d\'urgence',
    montantCible: 10000,
    montantActuel: 4500,
    dateDebut: '2025-01-01',
    dateCible: '2026-12-31',
    categorie: 'urgence',
    priorite: 'haute',
    statut: 'en_cours',
  },
  {
    id: 3,
    nom: 'Nouveau Laptop',
    montantCible: 2000,
    montantActuel: 800,
    dateDebut: '2025-01-01',
    dateCible: '2025-06-30',
    categorie: 'achat',
    priorite: 'moyenne',
    statut: 'en_cours',
  },
];

// Mock Transactions (pour GPS Financier)
export const mockTransactions = [
  {
    id: 1,
    date: '2025-01-15',
    description: 'Salaire',
    montant: 3500,
    type: 'entree',
    compteId: 1,
    soldeApres: 8500,
  },
  {
    id: 2,
    date: '2025-01-01',
    description: 'Loyer',
    montant: -1200,
    type: 'sortie',
    compteId: 1,
    soldeApres: 7300,
  },
  {
    id: 3,
    date: '2025-01-10',
    description: 'Épicerie',
    montant: -150,
    type: 'sortie',
    compteId: 1,
    soldeApres: 7150,
  },
];

// Mock Statistiques Dashboard
export const mockStats = {
  soldeTotal: 6950.75,
  revenusMonthly: 7000,
  depensesMonthly: 2350,
  epargneMonthly: 4650,
  objectifsProgress: 47.5,
  transactions30Days: 45,
};