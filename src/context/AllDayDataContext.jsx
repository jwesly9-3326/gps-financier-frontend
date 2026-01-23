// 🗓️ ALL DAY DATA CONTEXT - Partage des données journalières entre pages
// GPSFinancier calcule allDayData et l'expose via ce contexte
// Comptes.jsx et autres pages peuvent consommer ces données

import { createContext, useContext, useState, useCallback } from 'react';

const AllDayDataContext = createContext(null);

export const AllDayDataProvider = ({ children }) => {
  const [allDayData, setAllDayData] = useState([]);
  const [isDataReady, setIsDataReady] = useState(false);

  // Fonction pour que GPSFinancier puisse mettre à jour les données
  const updateAllDayData = useCallback((data) => {
    setAllDayData(data);
    setIsDataReady(data && data.length > 0);
  }, []);

  return (
    <AllDayDataContext.Provider value={{
      allDayData,
      isDataReady,
      updateAllDayData
    }}>
      {children}
    </AllDayDataContext.Provider>
  );
};

export const useAllDayDataContext = () => {
  const context = useContext(AllDayDataContext);
  if (!context) {
    // Si pas dans le provider, retourner un objet vide
    return { allDayData: [], isDataReady: false, updateAllDayData: () => {} };
  }
  return context;
};

export default AllDayDataContext;
