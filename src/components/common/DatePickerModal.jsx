// 📅 DATE PICKER MODAL - Sélection de date complète (jour/mois/année)
// Style cohérent avec DayPickerModal
// Touch-friendly pour mobile et desktop

import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const DatePickerModal = ({
  isOpen,
  onClose,
  onConfirm,
  initialValue = null,
  title = '',
  minDate = null,
  maxDate = null,
}) => {
  const { t, i18n } = useTranslation();
  
  // Helper pour parser une date sans décalage de fuseau horaire
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  
  // État pour la date courante affichée dans le calendrier
  const [viewDate, setViewDate] = useState(() => {
    if (initialValue) return parseLocalDate(initialValue);
    return new Date();
  });
  
  // État pour la date sélectionnée
  const [selectedDate, setSelectedDate] = useState(() => {
    if (initialValue) return parseLocalDate(initialValue);
    return null;
  });

  // Mois complets
  const monthsFull = i18n.language === 'fr'
    ? ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Jours de la semaine courts
  const weekDaysShort = i18n.language === 'fr'
    ? ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  useEffect(() => {
    if (isOpen) {
      if (initialValue) {
        const date = parseLocalDate(initialValue);
        setViewDate(date);
        setSelectedDate(date);
      } else {
        setViewDate(new Date());
        setSelectedDate(null);
      }
    }
  }, [isOpen, initialValue]);

  // Bloquer le scroll du body quand ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Gérer les touches du clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && selectedDate) handleConfirm();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedDate]);

  const handleConfirm = () => {
    if (selectedDate) {
      // Format YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      onConfirm(`${year}-${month}-${day}`);
      onClose();
    }
  };

  // Navigation mois
  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // Générer les jours du calendrier
  const generateCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    // Premier jour du mois
    const firstDay = new Date(year, month, 1);
    const startingDay = firstDay.getDay(); // 0 = Dimanche
    
    // Nombre de jours dans le mois
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Jours du mois précédent pour remplir la première semaine
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const days = [];
    
    // Jours du mois précédent (grisés)
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        currentMonth: false,
        date: new Date(year, month - 1, daysInPrevMonth - i)
      });
    }
    
    // Jours du mois actuel
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        currentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    // Jours du mois suivant pour compléter la grille (6 semaines max)
    const remainingDays = 42 - days.length; // 6 semaines * 7 jours
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        currentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    
    return days;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    if (!selectedDate) return false;
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  const handleDayClick = (dayInfo) => {
    setSelectedDate(dayInfo.date);
    // Si on clique sur un jour d'un autre mois, naviguer vers ce mois
    if (!dayInfo.currentMonth) {
      setViewDate(new Date(dayInfo.date.getFullYear(), dayInfo.date.getMonth(), 1));
    }
  };

  const setToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  if (!isOpen) return null;

  const calendarDays = generateCalendarDays();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
        }}
      />
      
      {/* Modal */}
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '340px',
          background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '2px solid rgba(255,165,0,0.3)',
          animation: 'slideUp 0.3s ease',
        }}
      >
        {/* Titre */}
        <div style={{
          textAlign: 'center',
          marginBottom: '15px',
        }}>
          <div style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            color: 'white',
          }}>
            📅 {title || t('budget.selectDate', 'Sélectionner une date')}
          </div>
        </div>

        {/* Navigation mois/année */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
        }}>
          <button
            type="button"
            onClick={prevMonth}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '1.2em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ‹
          </button>
          
          <div style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
          }}>
            {monthsFull[viewDate.getMonth()]} {viewDate.getFullYear()}
          </div>
          
          <button
            type="button"
            onClick={nextMonth}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '1.2em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ›
          </button>
        </div>

        {/* En-têtes jours de la semaine */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          marginBottom: '8px',
        }}>
          {weekDaysShort.map((day, index) => (
            <div
              key={index}
              style={{
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.6)',
                padding: '4px 0',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grille des jours */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          marginBottom: '15px',
        }}>
          {calendarDays.map((dayInfo, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleDayClick(dayInfo)}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '50%',
                border: isToday(dayInfo.date) && !isSelected(dayInfo.date) ? '2px solid #f59e0b' : 'none',
                fontSize: '0.85rem',
                fontWeight: isSelected(dayInfo.date) ? '700' : '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: isSelected(dayInfo.date)
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'transparent',
                color: dayInfo.currentMonth 
                  ? (isSelected(dayInfo.date) ? 'white' : 'white')
                  : 'rgba(255, 255, 255, 0.3)',
                boxShadow: isSelected(dayInfo.date) ? '0 4px 15px rgba(245, 158, 11, 0.4)' : 'none',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {dayInfo.day}
            </button>
          ))}
        </div>

        {/* Bouton Aujourd'hui */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '15px',
        }}>
          <button
            type="button"
            onClick={setToday}
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              background: 'transparent',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t('common.today', "Aujourd'hui")}
          </button>
        </div>

        {/* Boutons d'action */}
        <div style={{
          display: 'flex',
          gap: '12px',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '10px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t('common.cancel', 'Annuler')}
          </button>
          
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedDate}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              background: selectedDate 
                ? 'linear-gradient(135deg, #00b4d8 0%, #0096c7 100%)'
                : 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: selectedDate ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              boxShadow: selectedDate ? '0 4px 15px rgba(0, 180, 216, 0.4)' : 'none',
              opacity: selectedDate ? 1 : 0.5,
            }}
          >
            {t('common.confirm', 'Confirmer')}
          </button>
        </div>
      </div>

      {/* Animation CSS */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

DatePickerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  initialValue: PropTypes.string,
  title: PropTypes.string,
  minDate: PropTypes.string,
  maxDate: PropTypes.string,
};

export default DatePickerModal;
