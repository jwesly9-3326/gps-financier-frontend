// ============================================
// HOOK useMultiBudget - Gestion des segments de budget
// GPS FINANCIER v5.28 - Voyage dans le temps financier
// Avec génération automatique des segments
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Hook pour gérer les segments de budget multi-temporels
 * Permet le "voyage dans le temps" transparent pour l'utilisateur
 */
export const useMultiBudget = (userData) => {
  const [segments, setSegments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [stats, setStats] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Récupérer le token avec nettoyage des guillemets
  const getToken = useCallback(() => {
    const token = localStorage.getItem('gps_financier_token');
    return token ? token.replace(/"/g, '') : null;
  }, []);

  // ============================================
  // INITIALISATION - Charger les segments existants
  // ============================================
  useEffect(() => {
    const initializeSegments = async () => {
      try {
        setIsLoading(true);
        const token = getToken();
        
        if (!token) {
          // Mode démo sans authentification
          if (userData?.budgetPlanning) {
            const demoSegment = createSegmentFromBudget(userData.budgetPlanning, 0);
            setSegments([demoSegment]);
            setIsInitialized(true);
          }
          setIsLoading(false);
          return;
        }

        // Charger les segments existants
        const response = await fetch(`${API_URL}/api/budget-segments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success && data.segments && data.segments.length > 0) {
          setSegments(data.segments);
          setIsInitialized(true);
        } else {
          // Aucun segment - générer automatiquement
          console.log('[useMultiBudget] Aucun segment trouvé, génération automatique...');
          
          // Récupérer le budget depuis userData (localStorage)
          const budgetEntrees = userData?.budgetPlanning?.entrees || [];
          const budgetSorties = userData?.budgetPlanning?.sorties || [];
          
          if (budgetEntrees.length === 0 && budgetSorties.length === 0) {
            console.log('[useMultiBudget] Budget vide, pas de génération');
            setIsInitialized(true);
            setIsLoading(false);
            return;
          }
          
          try {
            const genResponse = await fetch(`${API_URL}/api/budget-segments/generate`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                batchSize: 100, // Plus de segments pour couvrir plus de temps
                entrees: budgetEntrees,
                sorties: budgetSorties,
                occurrencesPerSegment: 1 // 1 = mensuel (~1 mois par segment)
              })
            });
            
            if (genResponse.ok) {
              const genData = await genResponse.json();
              console.log('[useMultiBudget] Segments générés:', genData);
              
              // Recharger les segments
              const reloadResponse = await fetch(`${API_URL}/api/budget-segments`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const reloadData = await reloadResponse.json();
              
              if (reloadData.success && reloadData.segments) {
                setSegments(reloadData.segments);
              }
            } else {
              console.error('[useMultiBudget] Erreur génération:', await genResponse.text());
            }
          } catch (genError) {
            console.error('[useMultiBudget] Erreur génération auto:', genError);
          }
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('Error initializing multi-budget:', err);
        setError(err.message);
        
        // Fallback: utiliser le budget existant
        if (userData?.budgetPlanning) {
          const fallbackSegment = createSegmentFromBudget(userData.budgetPlanning, 0);
          setSegments([fallbackSegment]);
          setIsInitialized(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeSegments();
  }, [userData?.budgetPlanning, getToken]);

  // ============================================
  // GÉNÉRATION AUTOMATIQUE DES SEGMENTS
  // ============================================
  
  /**
   * Génère tous les segments jusqu'à l'année cible (défaut: 2079)
   */
  const generateAllSegments = useCallback(async (targetYear = 2079) => {
    const token = getToken();
    if (!token) {
      throw new Error('Non authentifié');
    }
    
    const budgetEntrees = userData?.budgetPlanning?.entrees || [];
    const budgetSorties = userData?.budgetPlanning?.sorties || [];

    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/budget-segments/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          targetYear,
          entrees: budgetEntrees,
          sorties: budgetSorties,
          occurrencesPerSegment: 1 // 1 = mensuel
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`[useMultiBudget] Generated segments:`, result);

      // Recharger les segments
      const reloadResponse = await fetch(`${API_URL}/api/budget-segments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const reloadData = await reloadResponse.json();
      
      if (reloadData.success && reloadData.segments) {
        setSegments(reloadData.segments);
      }

      return result;
      
    } catch (err) {
      console.error('[useMultiBudget] Error generating segments:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [getToken, userData?.budgetPlanning]);

  /**
   * Génère un batch limité de segments (pour tests rapides)
   */
  const generateSegmentsBatch = useCallback(async (batchSize = 50) => {
    const token = getToken();
    if (!token) {
      throw new Error('Non authentifié');
    }
    
    const budgetEntrees = userData?.budgetPlanning?.entrees || [];
    const budgetSorties = userData?.budgetPlanning?.sorties || [];

    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/budget-segments/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          batchSize,
          entrees: budgetEntrees,
          sorties: budgetSorties,
          occurrencesPerSegment: 1 // 1 = mensuel
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // Recharger les segments
      const reloadResponse = await fetch(`${API_URL}/api/budget-segments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const reloadData = await reloadResponse.json();
      
      if (reloadData.success && reloadData.segments) {
        setSegments(reloadData.segments);
      }

      return result;
      
    } catch (err) {
      console.error('[useMultiBudget] Error generating batch:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [getToken]);

  /**
   * Supprime tous les segments (réinitialisation)
   */
  const clearAllSegments = useCallback(async () => {
    const token = getToken();
    if (!token) {
      throw new Error('Non authentifié');
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}/api/budget-segments/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setSegments([]);
      return result;
      
    } catch (err) {
      console.error('[useMultiBudget] Error clearing segments:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  /**
   * Met à jour un segment avec cascade (réinitialise les segments suivants)
   */
  const updateSegmentWithCascade = useCallback(async (segmentIndex, entrees, sorties) => {
    const token = getToken();
    if (!token) {
      throw new Error('Non authentifié');
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}/api/budget-segments/${segmentIndex}/cascade`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ entrees, sorties })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // Recharger les segments
      const reloadResponse = await fetch(`${API_URL}/api/budget-segments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const reloadData = await reloadResponse.json();
      
      if (reloadData.success && reloadData.segments) {
        setSegments(reloadData.segments);
      }

      return result;
      
    } catch (err) {
      console.error('[useMultiBudget] Error updating segment with cascade:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  /**
   * Prévisualise le calcul DATE MAX
   */
  const previewCalculation = useCallback(async (fromDate = null) => {
    const token = getToken();
    if (!token) {
      throw new Error('Non authentifié');
    }

    try {
      const url = fromDate 
        ? `${API_URL}/api/budget-segments/calculate-preview?fromDate=${fromDate}`
        : `${API_URL}/api/budget-segments/calculate-preview`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
      
    } catch (err) {
      console.error('[useMultiBudget] Error previewing calculation:', err);
      throw err;
    }
  }, [getToken]);

  // ============================================
  // FONCTION PRINCIPALE - Obtenir le budget pour une date
  // ============================================
  const getBudgetForDate = useCallback((dateStr) => {
    if (!segments.length) {
      return {
        entrees: userData?.budgetPlanning?.entrees || [],
        sorties: userData?.budgetPlanning?.sorties || [],
        segmentIndex: 0,
        segmentName: 'Budget Principal'
      };
    }

    const targetDate = new Date(dateStr);
    
    // Trouver le segment qui couvre cette date
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      const startDate = new Date(seg.startDate);
      const endDate = seg.endDate ? new Date(seg.endDate) : null;
      
      if (targetDate >= startDate && (!endDate || targetDate <= endDate)) {
        return {
          entrees: seg.entrees || [],
          sorties: seg.sorties || [],
          segmentIndex: seg.segmentIndex,
          segmentName: seg.name || `Budget ${i + 1}`
        };
      }
    }
    
    // Si aucun segment ne couvre, utiliser le dernier segment
    const lastSegment = segments[segments.length - 1];
    return {
      entrees: lastSegment?.entrees || [],
      sorties: lastSegment?.sorties || [],
      segmentIndex: lastSegment?.segmentIndex || 0,
      segmentName: lastSegment?.name || 'Budget Principal',
      needsExtension: true
    };
  }, [segments, userData?.budgetPlanning]);

  // ============================================
  // EXTENSION AUTOMATIQUE - Créer un nouveau segment
  // ============================================
  const extendBudget = useCallback(async (targetDate) => {
    try {
      const token = getToken();
      if (!token) {
        // Mode démo: créer un segment local
        const lastSegment = segments[segments.length - 1];
        const newSegment = {
          ...lastSegment,
          segmentIndex: lastSegment.segmentIndex + 1,
          name: `Budget ${new Date(targetDate).getFullYear()}`,
          startDate: lastSegment.endDate,
          endDate: null,
          isBase: false,
          copiedFrom: lastSegment.segmentIndex
        };
        setSegments([...segments, newSegment]);
        return newSegment;
      }

      const response = await fetch(`${API_URL}/api/budget-segments/extend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetDate })
      });

      const data = await response.json();
      if (data.success) {
        setSegments(prev => [...prev, data.segment]);
        return data.segment;
      }
    } catch (err) {
      console.error('Error extending budget:', err);
      setError(err.message);
    }
    return null;
  }, [segments, getToken]);

  // ============================================
  // MODIFICATION D'UN SEGMENT
  // ============================================
  const updateSegment = useCallback(async (segmentIndex, updates) => {
    try {
      const token = getToken();
      
      if (!token) {
        // Mode démo: mise à jour locale
        setSegments(prev => prev.map(seg => 
          seg.segmentIndex === segmentIndex 
            ? { ...seg, ...updates }
            : seg
        ));
        return true;
      }

      const response = await fetch(`${API_URL}/api/budget-segments/${segmentIndex}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      if (data.success) {
        setSegments(prev => prev.map(seg => 
          seg.segmentIndex === segmentIndex 
            ? data.segment
            : seg
        ));
        return true;
      }
    } catch (err) {
      console.error('Error updating segment:', err);
      setError(err.message);
    }
    return false;
  }, [getToken]);

  // ============================================
  // DÉTECTION DE CHANGEMENT DE SEGMENT
  // ============================================
  const detectSegmentChange = useCallback((fromDate, toDate) => {
    if (segments.length <= 1) return null;
    
    const fromSegment = getBudgetForDate(fromDate);
    const toSegment = getBudgetForDate(toDate);
    
    if (fromSegment.segmentIndex !== toSegment.segmentIndex) {
      return {
        from: fromSegment,
        to: toSegment,
        changeDate: segments.find(s => s.segmentIndex === toSegment.segmentIndex)?.startDate
      };
    }
    return null;
  }, [segments, getBudgetForDate]);

  // ============================================
  // CALCULS AVEC SEGMENTS MULTIPLES
  // ============================================
  const calculateWithSegments = useMemo(() => {
    return (dateStr) => {
      const budget = getBudgetForDate(dateStr);
      return {
        entrees: budget.entrees,
        sorties: budget.sorties,
        segmentInfo: {
          index: budget.segmentIndex,
          name: budget.segmentName,
          needsExtension: budget.needsExtension
        }
      };
    };
  }, [getBudgetForDate]);

  // ============================================
  // VÉRIFICATION SI GÉNÉRATION NÉCESSAIRE
  // ============================================
  const needsGeneration = useMemo(() => {
    return isInitialized && segments.length === 0 && userData?.budgetPlanning;
  }, [isInitialized, segments, userData?.budgetPlanning]);

  // ============================================
  // RETOUR DU HOOK
  // ============================================
  return {
    // État
    segments,
    isLoading,
    error,
    isInitialized,
    stats,
    isGenerating,
    
    // Indicateur de génération nécessaire
    needsGeneration,
    
    // Fonctions principales
    getBudgetForDate,
    calculateWithSegments,
    
    // Gestion des segments
    extendBudget,
    updateSegment,
    detectSegmentChange,
    
    // Génération automatique
    generateAllSegments,
    generateSegmentsBatch,
    clearAllSegments,
    updateSegmentWithCascade,
    previewCalculation,
    
    // Helpers
    currentSegment: segments[0] || null,
    lastSegment: segments[segments.length - 1] || null,
    segmentCount: segments.length
  };
};

// ============================================
// FONCTION UTILITAIRE - Créer un segment depuis un budget
// ============================================
function createSegmentFromBudget(budgetPlanning, index = 0) {
  const entrees = budgetPlanning?.entrees || [];
  const sorties = budgetPlanning?.sorties || [];
  
  let maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  
  [...entrees, ...sorties].forEach(item => {
    if (item.dateFin) {
      const endDate = new Date(item.dateFin);
      if (endDate > maxDate) maxDate = endDate;
    }
  });

  return {
    segmentIndex: index,
    name: 'Budget Principal',
    startDate: new Date().toISOString(),
    endDate: maxDate.toISOString(),
    entrees,
    sorties,
    isBase: true,
    copiedFrom: null
  };
}

export default useMultiBudget;
