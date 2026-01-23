// 👤 USER INFO SIMPLIFIÉ - Étape 1 (30 secondes)
// Seulement: Prénom + Âge
// ✨ Simplifié post-test Marie-Claude

import { useTranslation } from 'react-i18next';
import { useOnboarding } from '../../context/OnboardingContext';

const UserInfoSimplified = () => {
  const { formData, updateUserInfo, goNext, goBack, getProgressPercentage } = useOnboarding();
  const { t } = useTranslation();
  const userInfo = formData.userInfo;

  const handleChange = (field, value) => {
    updateUserInfo(field, value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mettre une valeur par défaut pour situationFamiliale (pour compatibilité)
    if (!userInfo.situationFamiliale) {
      updateUserInfo('situationFamiliale', 'celibataire');
    }
    goNext();
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '0 20px 20px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: '25px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '0.9em',
            color: 'rgba(255,255,255,0.8)'
          }}>
            <span>{t('onboarding.step', { current: 1, total: 3 })}</span>
            <span>{getProgressPercentage()}% {t('onboarding.completed')}</span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            background: '#e0e0e0',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${getProgressPercentage()}%`,
              background: 'linear-gradient(90deg, #ffd700 0%, #ff8c00 100%)',
              transition: 'width 0.3s ease',
              borderRadius: '10px'
            }}></div>
          </div>
        </div>

        {/* En-tête */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          {/* Logo O avec personnage */}
          <div style={{
            position: 'relative',
            width: '80px',
            height: '80px',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              position: 'absolute',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '4px solid transparent',
              background: 'linear-gradient(#040449, #040449) padding-box, linear-gradient(180deg, #ffd700, #ff8c00, #ff4500, #ffd700) border-box',
              animation: 'gps-ring-spin 3s linear infinite',
              boxShadow: '0 0 25px rgba(255, 165, 0, 0.5)'
            }} />
            <span style={{ fontSize: '2em', position: 'relative', zIndex: 1, filter: 'brightness(0) invert(1)' }}>👤</span>
          </div>
          
          <h1 style={{
            fontSize: '1.8em',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '0',
            fontFamily: "'Poppins', sans-serif"
          }}>
            {t('onboarding.userInfo.title')}
          </h1>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '35px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #e0e0e0'
          }}>
            {/* Prénom */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '8px',
                fontSize: '0.95em'
              }}>
                {t('onboarding.userInfo.firstName')} <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={userInfo.prenom || ''}
                onChange={(e) => handleChange('prenom', e.target.value)}
                placeholder={t('onboarding.userInfo.firstNamePlaceholder')}
                required
                minLength={2}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '1em',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  transition: 'all 0.3s',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ff9800';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 152, 0, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0e0e0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Âge */}
            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '8px',
                fontSize: '0.95em'
              }}>
                {t('onboarding.userInfo.age')} <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="number"
                min="18"
                max="100"
                value={userInfo.age || ''}
                onChange={(e) => handleChange('age', e.target.value)}
                placeholder={t('onboarding.userInfo.agePlaceholder')}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '1em',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  transition: 'all 0.3s',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ff9800';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 152, 0, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0e0e0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Message rassurant */}
          <div style={{
            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
            padding: '15px 20px',
            borderRadius: '10px',
            border: '2px solid #4CAF50',
            marginTop: '25px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '1.5em' }}>💾</span>
            <p style={{
              fontSize: '0.9em',
              color: '#2e7d32',
              margin: 0,
              lineHeight: '1.4'
            }} dangerouslySetInnerHTML={{ __html: t('onboarding.userInfo.autoSave') }} />
          </div>

          {/* Boutons de navigation */}
          <div style={{
            display: 'flex',
            gap: '15px',
            marginTop: '30px'
          }}>
            <button
              type="button"
              onClick={goBack}
              style={{
                flex: '0 0 auto',
                padding: '14px 25px',
                fontSize: '1em',
                fontWeight: '600',
                color: '#7f8c8d',
                background: 'white',
                border: '2px solid #bdc3c7',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ecf0f1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
              }}
            >
              ← {t('common.back')}
            </button>
            
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '14px 30px',
                fontSize: '1em',
                fontWeight: 'bold',
                color: 'white',
                background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 15px rgba(255, 152, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 152, 0, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 152, 0, 0.4)';
              }}
            >
              {t('common.next')} →
            </button>
          </div>
        </form>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes gps-ring-spin {
          0% {
            transform: rotate(0deg);
            box-shadow: 0 0 20px rgba(255, 165, 0, 0.5);
          }
          50% {
            box-shadow: 0 0 35px rgba(255, 165, 0, 0.8), 0 0 50px rgba(255, 69, 0, 0.4);
          }
          100% {
            transform: rotate(360deg);
            box-shadow: 0 0 20px rgba(255, 165, 0, 0.5);
          }
        }
      `}</style>
    </div>
  );
};

export default UserInfoSimplified;
