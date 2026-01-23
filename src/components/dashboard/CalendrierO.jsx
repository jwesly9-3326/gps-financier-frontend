// 🔮 CALENDRIER O - Événements saisonniers pour anticiper les dépenses
// 🌍 i18n enabled
// ✅ Utilise useGuideProgress pour la logique centralisée

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../../context/SubscriptionContext';
import { UpgradeModal } from '../common/UpgradePrompt';
import useGuideProgress from '../../hooks/useGuideProgress';
import { useTheme } from '../../context/ThemeContext';

// Base de données des événements saisonniers - avec clés i18n
const ALL_SEASONAL_EVENTS = [
  // JANVIER
  { month: 0, day: 1, titleKey: 'events.newYear', descKey: 'events.newYearDesc', categoryKey: 'events.categories.holidays', icon: '🎉', borderColor: '#9b59b6', priority: 2 },
  { month: 0, day: 15, titleKey: 'events.winterSales', descKey: 'events.winterSalesDesc', categoryKey: 'events.categories.shopping', icon: '🏷️', borderColor: '#3498db', priority: 1 },
  
  // FÉVRIER
  { month: 1, day: 14, titleKey: 'events.valentines', descKey: 'events.valentinesDesc', categoryKey: 'events.categories.leisure', icon: '💝', borderColor: '#e91e63', priority: 3 },
  { month: 1, day: 20, titleKey: 'events.springBreak', descKey: 'events.springBreakDesc', categoryKey: 'events.categories.vacation', icon: '🎿', borderColor: '#00bcd4', priority: 1 },
  
  // MARS
  { month: 2, day: 17, titleKey: 'events.stPatrick', descKey: 'events.stPatrickDesc', categoryKey: 'events.categories.leisure', icon: '☘️', borderColor: '#27ae60', priority: 1 },
  { month: 2, day: 20, titleKey: 'events.springStart', descKey: 'events.springStartDesc', categoryKey: 'events.categories.home', icon: '🌸', borderColor: '#e67e22', priority: 2 },
  
  // AVRIL
  { month: 3, day: 20, titleKey: 'events.easter', descKey: 'events.easterDesc', categoryKey: 'events.categories.holidays', icon: '🐰', borderColor: '#f39c12', priority: 3 },
  { month: 3, day: 30, titleKey: 'events.taxReturn', descKey: 'events.taxReturnDesc', categoryKey: 'events.categories.admin', icon: '📝', borderColor: '#7f8c8d', priority: 2 },
  
  // MAI
  { month: 4, day: 11, titleKey: 'events.mothersDay', descKey: 'events.mothersDayDesc', categoryKey: 'events.categories.family', icon: '💐', borderColor: '#e91e63', priority: 3 },
  { month: 4, day: 19, titleKey: 'events.patriotsDay', descKey: 'events.patriotsDayDesc', categoryKey: 'events.categories.leisure', icon: '🍁', borderColor: '#e74c3c', priority: 1 },
  
  // JUIN
  { month: 5, day: 15, titleKey: 'events.fathersDay', descKey: 'events.fathersDayDesc', categoryKey: 'events.categories.family', icon: '👔', borderColor: '#3498db', priority: 3 },
  { month: 5, day: 24, titleKey: 'events.stJeanBaptiste', descKey: 'events.stJeanBaptisteDesc', categoryKey: 'events.categories.holidays', icon: '🎆', borderColor: '#2980b9', priority: 2 },
  { month: 5, day: 21, titleKey: 'events.summerStart', descKey: 'events.summerStartDesc', categoryKey: 'events.categories.home', icon: '☀️', borderColor: '#f1c40f', priority: 1 },
  
  // JUILLET
  { month: 6, day: 1, titleKey: 'events.canadaDay', descKey: 'events.canadaDayDesc', categoryKey: 'events.categories.holidays', icon: '🇨🇦', borderColor: '#e74c3c', priority: 2 },
  { month: 6, day: 15, titleKey: 'events.summerVacation', descKey: 'events.summerVacationDesc', categoryKey: 'events.categories.vacation', icon: '🏖️', borderColor: '#00bcd4', priority: 3 },
  
  // AOÛT
  { month: 7, day: 25, titleKey: 'events.backToSchool', descKey: 'events.backToSchoolDesc', categoryKey: 'events.categories.education', icon: '📚', borderColor: '#f39c12', priority: 3 },
  
  // SEPTEMBRE
  { month: 8, day: 1, titleKey: 'events.laborDay', descKey: 'events.laborDayDesc', categoryKey: 'events.categories.leisure', icon: '👷', borderColor: '#3498db', priority: 2 },
  { month: 8, day: 22, titleKey: 'events.fallStart', descKey: 'events.fallStartDesc', categoryKey: 'events.categories.home', icon: '🍂', borderColor: '#e67e22', priority: 1 },
  
  // OCTOBRE
  { month: 9, day: 13, titleKey: 'events.thanksgiving', descKey: 'events.thanksgivingDesc', categoryKey: 'events.categories.holidays', icon: '🦃', borderColor: '#e67e22', priority: 2 },
  { month: 9, day: 31, titleKey: 'events.halloween', descKey: 'events.halloweenDesc', categoryKey: 'events.categories.holidays', icon: '🎃', borderColor: '#f39c12', priority: 3 },
  
  // NOVEMBRE
  { month: 10, day: 29, titleKey: 'events.blackFriday', descKey: 'events.blackFridayDesc', categoryKey: 'events.categories.shopping', icon: '🛍️', borderColor: '#2c3e50', priority: 3 },
  
  // DÉCEMBRE
  { month: 11, day: 15, titleKey: 'events.officeParty', descKey: 'events.officePartyDesc', categoryKey: 'events.categories.work', icon: '🎊', borderColor: '#3498db', priority: 1 },
  { month: 11, day: 25, titleKey: 'events.christmas', descKey: 'events.christmasDesc', categoryKey: 'events.categories.holidays', icon: '🎄', borderColor: '#27ae60', priority: 3 },
  { month: 11, day: 31, titleKey: 'events.newYearsEve', descKey: 'events.newYearsEveDesc', categoryKey: 'events.categories.holidays', icon: '🥂', borderColor: '#9b59b6', priority: 2 },
];

const CalendrierO = ({ interactive = true }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { canAccessGpsView } = useSubscription();
  const [selectedPeriod, setSelectedPeriod] = useState('3');
  const [upgradeModal, setUpgradeModal] = useState({ isOpen: false, type: null });
  const { isDark } = useTheme();
  
  // ✅ Hook centralisé pour la progression du guide
  const { isGuideComplete } = useGuideProgress();
  // Boutons GPS débloqués seulement après "Terminer!" (fin complète du guide)
  const isGpsAccessible = isGuideComplete;

  // Calcul des événements à afficher
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    const monthsAhead = parseInt(selectedPeriod);

    const eventsInPeriod = [];

    ALL_SEASONAL_EVENTS.forEach(event => {
      let eventDate = new Date(currentYear, event.month, event.day);
      
      if (eventDate < today) {
        eventDate = new Date(currentYear + 1, event.month, event.day);
      }

      const monthsDiff = (eventDate.getFullYear() - today.getFullYear()) * 12 + (eventDate.getMonth() - today.getMonth());

      if (monthsDiff >= 0 && monthsDiff < monthsAhead) {
        eventsInPeriod.push({
          ...event,
          // Traduire les clés
          title: t(event.titleKey),
          description: t(event.descKey),
          category: t(event.categoryKey),
          date: eventDate,
          monthsDiff,
          id: `${currentYear}-${event.month}-${event.day}-${event.titleKey}`
        });
      }
    });

    eventsInPeriod.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.date - b.date;
    });

    if (eventsInPeriod.length <= 3) {
      return eventsInPeriod.sort((a, b) => a.date - b.date);
    }

    const segmentSize = monthsAhead / 3;
    const selected = [];
    
    for (let segment = 0; segment < 3; segment++) {
      const segmentStart = segment * segmentSize;
      const segmentEnd = (segment + 1) * segmentSize;
      
      const eventsInSegment = eventsInPeriod.filter(e => 
        e.monthsDiff >= segmentStart && e.monthsDiff < segmentEnd &&
        !selected.find(s => s.id === e.id)
      );
      
      if (eventsInSegment.length > 0) {
        selected.push(eventsInSegment[0]);
      }
    }

    while (selected.length < 3 && selected.length < eventsInPeriod.length) {
      const remaining = eventsInPeriod.filter(e => !selected.find(s => s.id === e.id));
      if (remaining.length > 0) {
        selected.push(remaining[0]);
      } else {
        break;
      }
    }

    return selected.sort((a, b) => a.date - b.date);
  }, [selectedPeriod, t]);

  const formatMonthYear = (date) => {
    return date.toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', {
      month: 'long',
      year: 'numeric'
    });
  };

  const getDaysUntil = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('common.today');
    if (diffDays === 1) return t('common.tomorrow');
    if (diffDays < 7) return t('dashboard.calendarO.inDays', { count: diffDays });
    if (diffDays < 30) {
      const weeks = Math.ceil(diffDays / 7);
      return t('dashboard.calendarO.inWeeks', { count: weeks });
    }
    const months = Math.ceil(diffDays / 30);
    return t('dashboard.calendarO.inMonths', { count: months });
  };

  // Clic sur événement → GPS avec le mois de l'événement
  const handleEventClick = (event) => {
    if (!interactive) return;
    
    // 🔒 Bloquer si le guide n'est pas assez avancé
    if (!isGpsAccessible) {
      console.log('[CalendrierO] Navigation vers GPS bloquée - guide non complété');
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    
    // Calculer le nombre de jours jusqu'à l'événement
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // 🔒 Discovery: limité à 90 jours, vue JOUR uniquement
    if (!canAccessGpsView('month')) {
      if (diffDays > 90) {
        // L'événement est hors de la plage des 90 jours → popup de restriction
        setUpgradeModal({ isOpen: true, type: 'gpsMonth' });
        return;
      }
      // L'événement est dans les 90 jours → naviguer vers vue JOUR
      navigate('/gps', {
        state: {
          targetDate: event.date.toISOString().split('T')[0],
          targetMonth: event.date.getMonth(),
          targetYear: event.date.getFullYear(),
          eventTitle: event.title,
          viewMode: 'day'
        }
      });
      return;
    }
    
    // 🔒 Essentiel: limité à 12 mois (365 jours)
    if (diffDays > 365) {
      setUpgradeModal({ isOpen: true, type: 'gpsMonth' });
      return;
    }
    
    // ✅ Essentiel/Premium: accès à la vue MOIS
    navigate('/gps', {
      state: {
        targetMonth: event.date.getMonth(),
        targetYear: event.date.getFullYear(),
        eventTitle: event.title,
        viewMode: 'month'
      }
    });
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* En-tête */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '15px' 
      }}>
        <div>
          <h2 style={{ 
            fontSize: '1.8em', 
            fontWeight: 'bold', 
            color: isDark ? 'white' : '#1e293b',
            marginBottom: '3px'
          }}>
            🔮 {t('dashboard.calendarO.title')}
          </h2>
          <p style={{ fontSize: '1em', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', margin: 0 }}>
            {t('dashboard.calendarO.subtitle')}
          </p>
        </div>

        {/* Boutons période */}
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          pointerEvents: interactive ? 'auto' : 'none'
        }}>
          {['3', '6', '12'].map(period => (
            <button
              key={period}
              onClick={interactive ? () => setSelectedPeriod(period) : undefined}
              style={{
                padding: '6px 14px',
                border: 'none',
                background: selectedPeriod === period ? '#e74c3c' : '#3498db',
                color: 'white',
                borderRadius: '5px',
                cursor: interactive ? 'pointer' : 'default',
                fontWeight: '600',
                transition: 'all 0.3s',
                fontSize: '0.9em'
              }}
            >
              {t('dashboard.calendarO.months', { count: period })}
            </button>
          ))}
        </div>
      </div>

      {/* 3 CARTES */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '15px',
        marginBottom: '15px'
      }}>
        {upcomingEvents.length > 0 ? upcomingEvents.map((event) => {
          const monthYear = formatMonthYear(event.date);
          const daysUntil = getDaysUntil(event.date);
          
          return (
            <div
              key={event.id}
              onClick={() => handleEventClick(event)}
              style={{
                background: 'white',
                borderRadius: '14px',
                padding: '18px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                borderTop: `4px solid ${event.borderColor}`,
                cursor: interactive && isGpsAccessible ? 'pointer' : 'default',
                transition: 'all 0.3s',
                position: 'relative',
                pointerEvents: interactive ? 'auto' : 'none',
                opacity: interactive && !isGpsAccessible ? 0.7 : 1
              }}
              onMouseEnter={interactive && isGpsAccessible ? (e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.12)';
              } : undefined}
              onMouseLeave={interactive && isGpsAccessible ? (e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
              } : undefined}
            >
              {/* Badge temps restant */}
              <span style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                fontSize: '0.65em',
                background: event.borderColor,
                color: 'white',
                padding: '3px 8px',
                borderRadius: '10px',
                fontWeight: '600'
              }}>
                {daysUntil}
              </span>

              {/* Icône */}
              <div style={{ fontSize: '2.5em', marginBottom: '8px' }}>
                {event.icon}
              </div>

              {/* Titre */}
              <h3 style={{ 
                fontWeight: 'bold', 
                fontSize: '1.1em', 
                color: '#2c3e50',
                marginBottom: '5px'
              }}>
                {event.title}
              </h3>

              {/* Description */}
              <p style={{ 
                fontSize: '0.9em', 
                color: event.borderColor,
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                {event.description}
              </p>

              {/* Date + Catégorie */}
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontSize: '0.8em', color: '#7f8c8d', marginBottom: '2px' }}>
                  {monthYear}
                </p>
                <span style={{
                  fontSize: '0.65em',
                  background: `${event.borderColor}15`,
                  color: event.borderColor,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontWeight: '500'
                }}>
                  {event.category}
                </span>
              </div>

              {/* CTA */}
              {isGpsAccessible && (
                <div style={{ 
                  color: '#3498db', 
                  fontSize: '0.8em', 
                  fontWeight: '600'
                }}>
                  {t('dashboard.calendarO.viewOnJourney')}
                </div>
              )}
            </div>
          );
        }) : (
          <div style={{
            gridColumn: 'span 3',
            textAlign: 'center',
            padding: '30px',
            background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
            borderRadius: '14px',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: isDark ? '0 4px 15px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.08)'
          }}>
            <span style={{ fontSize: '2.5em' }}>🎉</span>
            <p style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', marginTop: '8px' }}>
              {t('dashboard.calendarO.noEvents', { months: selectedPeriod })}
            </p>
          </div>
        )}
      </div>

      {/* Bulle message - visible seulement si guide non complété */}
      {!isGpsAccessible && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
          border: '1px solid #667eea30',
          borderRadius: '10px',
          padding: '12px 16px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '0.9em', color: '#ff9800', fontWeight: '600', margin: 0 }}>
            ✨ {t('dashboard.completeGuide')}
          </p>
        </div>
      )}
      
      {/* ========== MODAL UPGRADE (restrictions abonnement) ========== */}
      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal({ isOpen: false, type: null })}
        limitType={upgradeModal.type}
      />
    </div>
  );
};

export default CalendrierO;
