// 🎯 PLANIFICATION ÉVÉNEMENT - Page de planification d'un événement futur
// Permet d'estimer les dépenses et choisir le compte avant simulation GPS

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const PlanificationEvenement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 📦 Récupération des données de l'événement depuis CalendrierO
  const { event, period } = location.state || {};

  // 🔄 Redirection si pas de données d'événement
  useEffect(() => {
    if (!event) {
      navigate('/dashboard');
    }
  }, [event, navigate]);

  // 📋 États du formulaire
  const [formData, setFormData] = useState({
    estimatedAmount: event?.estimatedCost || 0,
    selectedAccount: '',
    notes: '',
    isRecurring: false,
    frequency: 'once' // once, monthly, yearly
  });

  // 💳 Comptes bancaires mockés (à remplacer par vraies données backend)
  const bankAccounts = [
    { id: 1, name: 'Compte Chèque Principal', balance: 5420, type: 'checking' },
    { id: 2, name: 'Compte Épargne', balance: 12800, type: 'savings' },
    { id: 3, name: 'Carte Crédit Visa', balance: -850, limit: 5000, type: 'credit' },
    { id: 4, name: 'Compte Vacances', balance: 3200, type: 'savings' }
  ];

  // 📊 Formatage de la devise
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // 📝 Gestion des changements de formulaire
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 🚀 Navigation vers simulation GPS
  const handleGoToSimulation = () => {
    if (!formData.selectedAccount) {
      alert('⚠️ Oups! Veuillez sélectionner un compte bancaire avant de continuer.');
      return;
    }

    if (formData.estimatedAmount <= 0) {
      alert('⚠️ Oups! Veuillez entrer un montant valide.');
      return;
    }

    // Navigation vers GPS Financier avec les données de planification
    navigate('/gps', {
      state: {
        planningData: {
          event: event,
          amount: formData.estimatedAmount,
          account: formData.selectedAccount,
          notes: formData.notes,
          isRecurring: formData.isRecurring,
          frequency: formData.frequency,
          period: period
        }
      }
    });
  };

  // 🔙 Retour au Dashboard
  const handleCancel = () => {
    navigate('/dashboard');
  };

  if (!event) return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* ============================================ */}
      {/* EN-TÊTE DE LA PAGE                           */}
      {/* ============================================ */}
      <div className="mb-8">
        <button 
          onClick={handleCancel}
          className="text-gray-600 hover:text-gray-800 mb-4 flex items-center gap-2"
        >
          ← Retour au Dashboard
        </button>
        
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          📝 Planification de l'événement
        </h1>
        <p className="text-gray-600 text-lg">
          Estimez vos dépenses et préparez votre budget pour cet événement
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ============================================ */}
        {/* COLONNE GAUCHE: INFORMATIONS ÉVÉNEMENT       */}
        {/* ============================================ */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-[#4CAF50] to-[#2196F3] rounded-xl shadow-lg p-6 text-white sticky top-6">
            <div className="text-center mb-4">
              <div className="text-6xl mb-3">{event.title.split(' ').pop()}</div>
              <h2 className="text-2xl font-bold mb-1">
                {event.title.replace(/[^\w\s]/gi, '').trim()}
              </h2>
              <p className="text-blue-100 text-sm">{event.category}</p>
            </div>

            <div className="border-t border-white/30 pt-4 mt-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-blue-100 text-sm">Période:</span>
                <span className="font-bold">+{event.offset} mois</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-blue-100 text-sm">Estimation initiale:</span>
                <span className="font-bold">{formatCurrency(event.estimatedCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100 text-sm">Vue sélectionnée:</span>
                <span className="font-bold">{period} mois</span>
              </div>
            </div>

            <div className="bg-white/20 rounded-lg p-4 mt-4">
              <p className="text-sm leading-relaxed">
                {event.description}
              </p>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* COLONNE DROITE: FORMULAIRE DE PLANIFICATION  */}
        {/* ============================================ */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              💰 Détails de votre planification
            </h3>

            {/* Montant estimé */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                Montant estimé <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                  $
                </span>
                <input
                  type="number"
                  value={formData.estimatedAmount}
                  onChange={(e) => handleInputChange('estimatedAmount', parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#4CAF50] focus:outline-none text-lg font-semibold"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                💡 Astuce: Ajoutez une marge de 10-15% pour les imprévus!
              </p>
            </div>

            {/* Sélection du compte */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                Compte à utiliser <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-3">
                {bankAccounts.map((account) => (
                  <div
                    key={account.id}
                    onClick={() => handleInputChange('selectedAccount', account.id)}
                    className={`
                      border-2 rounded-lg p-4 cursor-pointer transition-all
                      ${formData.selectedAccount === account.id
                        ? 'border-[#4CAF50] bg-green-50 shadow-md'
                        : 'border-gray-300 hover:border-[#4CAF50] hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-800">{account.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{account.type}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(account.balance)}
                        </p>
                        {account.type === 'credit' && (
                          <p className="text-xs text-gray-500">
                            Limite: {formatCurrency(account.limit)}
                          </p>
                        )}
                      </div>
                    </div>
                    {formData.selectedAccount === account.id && (
                      <div className="mt-2 text-green-600 text-sm font-semibold flex items-center gap-1">
                        ✓ Compte sélectionné
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Dépense récurrente */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                  className="w-5 h-5 text-[#4CAF50] rounded focus:ring-[#4CAF50]"
                />
                <label htmlFor="isRecurring" className="text-gray-700 font-semibold cursor-pointer">
                  Cette dépense est récurrente
                </label>
              </div>

              {formData.isRecurring && (
                <div className="ml-8">
                  <label className="block text-gray-700 font-semibold mb-2">
                    Fréquence
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => handleInputChange('frequency', e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4CAF50] focus:outline-none"
                  >
                    <option value="once">Une fois</option>
                    <option value="monthly">Mensuelle</option>
                    <option value="yearly">Annuelle</option>
                  </select>
                </div>
              )}
            </div>

            {/* Notes supplémentaires */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                Notes supplémentaires (optionnel)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#4CAF50] focus:outline-none resize-none"
                rows="4"
                placeholder="Ajoutez des détails sur cette dépense..."
              />
            </div>

            {/* Message d'encouragement */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                🎯 <span className="font-semibold">Prochaine étape:</span> Visualisez l'impact de cette dépense 
                sur votre trajectoire financière dans la simulation GPS Financier!
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-4">
              <button
                onClick={handleCancel}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleGoToSimulation}
                className="flex-1 px-6 py-3 bg-[#4CAF50] text-white font-semibold rounded-lg hover:bg-[#45a049] transition-colors shadow-lg hover:shadow-xl"
              >
                Voir la simulation GPS 🚀
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanificationEvenement;