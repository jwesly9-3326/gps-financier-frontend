// 🔔 useTrialReminders Hook
// Hook pour gérer l'affichage des popups de rappel trial
// Utilise le backend pour stocker les préférences

import { useState, useEffect, useCallback } from 'react';
import trialService from '../services/trial.service';
import { useAuth } from '../context/AuthContext';

/**
 * Hook pour gérer les rappels trial
 * @returns {Object} { showModal, popupType, daysRemaining, trialStatus, closeModal, refreshStatus }
 */
const useTrialReminders = () => {
  const { isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [popupType, setPopupType] = useState(null); // 'welcome' | 'reminder_7days' | 'reminder_2days'
  const [daysRemaining, setDaysRemaining] = useState(14);
  const [trialStatus, setTrialStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  // Récupérer le statut trial depuis le backend
  const fetchTrialStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await trialService.getStatus();
      
      setTrialStatus(response.trial);
      setDaysRemaining(response.trial?.daysRemaining || 0);
      
      // Déterminer si on doit afficher un popup
      if (response.showPopup) {
        setPopupType(response.showPopup);
        setShowModal(true);
        console.log(`[useTrialReminders] 🔔 Affichage popup: ${response.showPopup}`);
      } else {
        setShowModal(false);
        setPopupType(null);
      }
      
      setHasChecked(true);
    } catch (error) {
      console.error('[useTrialReminders] ❌ Erreur:', error);
      // En cas d'erreur, ne pas afficher de popup
      setShowModal(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Vérifier le statut au montage et quand l'authentification change
  useEffect(() => {
    if (isAuthenticated && !hasChecked) {
      fetchTrialStatus();
    }
  }, [isAuthenticated, hasChecked, fetchTrialStatus]);

  // Fermer le modal
  const closeModal = useCallback((action) => {
    setShowModal(false);
    setPopupType(null);
    console.log(`[useTrialReminders] Modal fermé avec action: ${action}`);
  }, []);

  // Rafraîchir le statut (utile après une action)
  const refreshStatus = useCallback(() => {
    setHasChecked(false);
  }, []);

  return {
    showModal,
    popupType,
    daysRemaining,
    trialStatus,
    isLoading,
    closeModal,
    refreshStatus
  };
};

export default useTrialReminders;
