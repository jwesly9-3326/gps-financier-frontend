// 📅 DAY PICKER MODAL - Sélection de jour adaptatif
// S'adapte au mode: monthDay (1-31), weekDay (Dim-Sam), lastDates (15 jan, etc.)
// Touch-friendly pour mobile et desktop

import PropTypes from 'prop-types';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const DayPickerModal = ({
  isOpen,
  onClose,
  onConfirm,
  initialValue = null,
  mode = 'monthDay', // 'monthDay' | 'weekDay' | 'lastDates'
  title = '',
}) => {
  const { t, i18n } = useTranslation();
  const [selectedValue, setSelectedValue] = useState(initialValue);

  // Jours de la semaine (index 0 = Dimanche)
  const weekDaysFull = i18n.language === 'fr'
    ? ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const weekDaysShort = i18n.language === 'fr'
    ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Mois abrégés
  const monthsShort = i18n.language === 'fr'
    ? ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Générer les 15 derniers jours
  const last15Days = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i <= 15; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push({
        value: date.toISOString().split('T')[0],
        day: date.getDate(),
        month: monthsShort[date.getMonth()],
        weekDay: weekDaysShort[date.getDay()],
        label: `${date.getDate()} ${monthsShort[date.getMonth()]}`
      });
    }
    return dates;
  }, [monthsShort, weekDaysShort]);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'monthDay') {
        setSelectedValue(initialValue || 1);
      } else if (mode === 'weekDay') {
        setSelectedValue(initialValue !== null && initialValue !== undefined ? initialValue : null);
      } else if (mode === 'lastDates') {
        setSelectedValue(initialValue || null);
      }
    }
  }, [isOpen, initialValue, mode]);

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
      if (e.key === 'Enter') handleConfirm();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedValue]);

  const handleConfirm = () => {
    onConfirm(selectedValue);
    onClose();
  };

  if (!isOpen) return null;

  // ========== RENDU: Jours du mois (1-31) ==========
  const renderMonthDays = () => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: '5px',
        marginBottom: '20px',
      }}>
        {days.map(day => (
          <button
            key={day}
            type="button"
            onClick={() => setSelectedValue(day)}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: selectedValue === day ? '700' : '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: selectedValue === day 
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              boxShadow: selectedValue === day ? '0 4px 15px rgba(245, 158, 11, 0.4)' : 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
            }}
          >
            {day}
          </button>
        ))}
      </div>
    );
  };

  // ========== RENDU: Jours de la semaine (Dim-Sam) ==========
  const renderWeekDays = () => {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        marginBottom: '20px',
        justifyItems: 'center',
      }}>
        {weekDaysShort.map((dayName, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setSelectedValue(index)}
            style={{
              width: '100%',
              minWidth: '70px',
              padding: '16px 8px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: selectedValue === index ? '700' : '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: selectedValue === index 
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              textAlign: 'center',
              boxShadow: selectedValue === index ? '0 4px 15px rgba(245, 158, 11, 0.4)' : 'none',
            }}
          >
            {dayName}
          </button>
        ))}
      </div>
    );
  };

  // ========== RENDU: 15 dernières dates (15 jan, 14 jan, etc.) ==========
  const renderLastDates = () => {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        marginBottom: '20px',
        justifyItems: 'center',
      }}>
        {last15Days.map((dateInfo) => (
          <button
            key={dateInfo.value}
            type="button"
            onClick={() => setSelectedValue(dateInfo.value)}
            style={{
              width: '100%',
              minWidth: '65px',
              padding: '12px 6px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: selectedValue === dateInfo.value ? '700' : '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: selectedValue === dateInfo.value 
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              textAlign: 'center',
              boxShadow: selectedValue === dateInfo.value ? '0 4px 15px rgba(245, 158, 11, 0.4)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <span style={{ fontSize: '1.1em', fontWeight: '700' }}>{dateInfo.day}</span>
            <span style={{ fontSize: '0.75em', opacity: 0.8 }}>{dateInfo.month}</span>
          </button>
        ))}
      </div>
    );
  };

  // Déterminer le titre dynamique
  const getTitle = () => {
    if (title) return title;
    
    switch (mode) {
      case 'weekDay':
        return t('budget.selectWeekDay', 'Jour de la semaine');
      case 'lastDates':
        return t('budget.selectLastDate', 'Dernière date');
      default:
        return t('budget.selectMonthDay', 'Jour du mois');
    }
  };

  // Déterminer l'affichage de la sélection actuelle
  const getSelectedDisplay = () => {
    switch (mode) {
      case 'weekDay':
        return selectedValue !== null && selectedValue !== undefined ? weekDaysFull[selectedValue] : t('common.select', 'Sélectionner...');
      case 'lastDates':
        const dateInfo = last15Days.find(d => d.value === selectedValue);
        return dateInfo ? `${dateInfo.weekDay} ${dateInfo.day} ${dateInfo.month}` : t('common.select', 'Sélectionner...');
      default:
        return selectedValue || t('common.select', 'Sélectionner...');
    }
  };

  // Déterminer le contenu selon le mode
  const renderContent = () => {
    switch (mode) {
      case 'weekDay':
        return renderWeekDays();
      case 'lastDates':
        return renderLastDates();
      default:
        return renderMonthDays();
    }
  };

  // Largeur du modal selon le mode
  const getMaxWidth = () => {
    switch (mode) {
      case 'weekDay':
        return '340px';
      case 'lastDates':
        return '340px';
      default:
        return '340px';
    }
  };

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
      
      {/* Modal - Même style que le formulaire */}
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: getMaxWidth(),
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
          marginBottom: '20px',
        }}>
          <div style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            color: 'white',
            marginBottom: '4px',
          }}>
            📅 {getTitle()}
          </div>
          
          {/* Indicateur de sélection actuelle */}
          <div style={{
            fontSize: '0.9rem',
            color: '#f59e0b',
            fontWeight: '500',
          }}>
            {getSelectedDisplay()}
          </div>
        </div>

        {/* Contenu adaptatif */}
        {renderContent()}

        {/* Boutons d'action - Même style que le formulaire principal */}
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
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #00b4d8 0%, #0096c7 100%)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 15px rgba(0, 180, 216, 0.4)',
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

DayPickerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  initialValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  mode: PropTypes.oneOf(['monthDay', 'weekDay', 'lastDates']),
  title: PropTypes.string,
};

export default DayPickerModal;
