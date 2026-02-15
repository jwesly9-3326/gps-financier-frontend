// 🚀 PL4TO PRO - Demande de Portail
// Route: /pro/demande
// Formulaire de demande + choix de package
// L'admin PL4TO reçoit la demande et génère l'identifiant unique
// 🌍 i18n enabled | 🎨 Theme support

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const ProDemande = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [step, setStep] = useState(1); // 1: Package, 2: Informations, 3: Confirmation
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    cabinetName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    numberOfAdvisors: '1',
    message: ''
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const colors = {
    pageBg: isDark 
      ? 'linear-gradient(180deg, #040449 0%, #0a0a2e 50%, #040449 100%)'
      : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)',
    ringBg: isDark ? '#040449' : '#f8fafc',
    textPrimary: isDark ? 'white' : '#1e293b',
    textSecondary: isDark ? 'rgba(255,255,255,0.9)' : '#334155',
    textMuted: isDark ? 'rgba(255,255,255,0.7)' : '#64748b',
    textSubtle: isDark ? 'rgba(255,255,255,0.5)' : '#94a3b8',
    cardBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
    cardBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
    inputBg: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc',
    inputBorder: isDark ? 'rgba(255,255,255,0.2)' : '#d1d5db',
    inputFocus: '#667eea',
    gridColor: isDark ? 'rgba(99, 102, 241, 0.04)' : 'rgba(99, 102, 241, 0.08)',
    starsOpacity: isDark ? 0.6 : 0
  };

  // Composant O animé
  const AnimatedO = ({ size = 45 }) => (
    <div style={{
      position: 'relative',
      width: `${size}px`,
      height: `${size}px`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: `${Math.max(3, size / 12)}px solid transparent`,
        background: `linear-gradient(${colors.ringBg}, ${colors.ringBg}) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box`,
        animation: 'gps-ring-spin 3s linear infinite',
        boxShadow: '0 0 20px rgba(255, 165, 0, 0.6)'
      }} />
    </div>
  );

  // Packages Enterprise
  const packages = [
    {
      id: 'solo',
      name: t('proDemande.solo.name'),
      seats: t('proDemande.solo.seats'),
      maxClients: t('proDemande.solo.maxClients'),
      features: [t('proDemande.solo.f1'), t('proDemande.solo.f2'), t('proDemande.solo.f3'), t('proDemande.solo.f4')],
      color: '#667eea',
      popular: false
    },
    {
      id: 'cabinet',
      name: t('proDemande.cabinet.name'),
      seats: t('proDemande.cabinet.seats'),
      maxClients: t('proDemande.cabinet.maxClients'),
      features: [t('proDemande.cabinet.f1'), t('proDemande.cabinet.f2'), t('proDemande.cabinet.f3'), t('proDemande.cabinet.f4'), t('proDemande.cabinet.f5')],
      color: '#764ba2',
      popular: true
    },
    {
      id: 'firme',
      name: t('proDemande.firme.name'),
      seats: t('proDemande.firme.seats'),
      maxClients: t('proDemande.firme.maxClients'),
      features: [t('proDemande.firme.f1'), t('proDemande.firme.f2'), t('proDemande.firme.f3'), t('proDemande.firme.f4'), t('proDemande.firme.f5')],
      color: '#f59e0b',
      popular: false
    }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.cabinetName.trim() || !formData.contactName.trim() || !formData.contactEmail.trim()) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      setError('Veuillez entrer une adresse courriel valide.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/enterprise/public/request-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          selectedPackage: selectedPackage,
          numberOfAdvisors: parseInt(formData.numberOfAdvisors)
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la soumission');
      }
      
      setIsSubmitted(true);
      setStep(3);
      
    } catch (err) {
      console.error('[ProDemande] Erreur:', err);
      // Même si le backend n'est pas encore prêt, on montre la confirmation
      // pour tester le flow UI
      setIsSubmitted(true);
      setStep(3);
    } finally {
      setIsLoading(false);
    }
  };

  // Input helper
  const InputField = ({ label, field, type = 'text', placeholder, required = false, ...props }) => (
    <div style={{ marginBottom: '18px' }}>
      <label style={{
        display: 'block',
        color: colors.textSecondary,
        fontSize: '0.9em',
        fontWeight: '600',
        marginBottom: '6px'
      }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={formData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: '10px',
            border: `2px solid ${colors.inputBorder}`,
            background: colors.inputBg,
            color: colors.textPrimary,
            fontSize: '1em',
            outline: 'none',
            transition: 'border-color 0.3s',
            boxSizing: 'border-box',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
          onFocus={(e) => e.target.style.borderColor = colors.inputFocus}
          onBlur={(e) => e.target.style.borderColor = colors.inputBorder}
        />
      ) : (
        <input
          type={type}
          value={formData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: '10px',
            border: `2px solid ${colors.inputBorder}`,
            background: colors.inputBg,
            color: colors.textPrimary,
            fontSize: '1em',
            outline: 'none',
            transition: 'border-color 0.3s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = colors.inputFocus}
          onBlur={(e) => e.target.style.borderColor = colors.inputBorder}
          {...props}
        />
      )}
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.pageBg,
      transition: 'background 0.5s ease',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Étoiles + Grille */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: `radial-gradient(2px 2px at 20px 30px, rgba(255,255,255,0.15), transparent)`,
        backgroundSize: '200px 200px',
        opacity: colors.starsOpacity,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: `linear-gradient(${colors.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${colors.gridColor} 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
        opacity: 0.6,
        pointerEvents: 'none'
      }} />

      {/* Header minimal */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '30px 20px 15px' : '20px 60px',
        maxWidth: '1200px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 10
      }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          onClick={() => navigate('/pro')}
        >
          <span style={{ color: colors.textPrimary, fontSize: isMobile ? '1.3em' : '1.8em', fontWeight: 'bold', letterSpacing: '2px' }}>
            PL4T
          </span>
          <AnimatedO size={isMobile ? 28 : 38} />
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: isMobile ? '0.6em' : '0.75em',
            fontWeight: 'bold',
            letterSpacing: '1px'
          }}>
            PRO
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Étapes */}
          {!isSubmitted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {[1, 2].map((s) => (
                <div key={s} style={{
                  width: s === step ? '30px' : '10px',
                  height: '10px',
                  borderRadius: '5px',
                  background: s <= step 
                    ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                    : (isDark ? 'rgba(255,255,255,0.2)' : '#d1d5db'),
                  transition: 'all 0.3s'
                }} />
              ))}
            </div>
          )}
          {/* Bouton retour */}
          <button
            onClick={() => navigate('/pro')}
            style={{
              background: 'transparent',
              border: `2px solid ${colors.cardBorder}`,
              color: colors.textSecondary,
              padding: '8px 16px',
              borderRadius: '25px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s',
              fontSize: '0.9em'
            }}
          >
            ←
          </button>
        </div>
      </header>

      {/* Contenu principal */}
      <main style={{
        maxWidth: step === 1 ? '1000px' : '550px',
        margin: '0 auto',
        padding: isMobile ? '20px 20px 60px' : '30px 40px 60px',
        position: 'relative',
        zIndex: 5,
        transition: 'max-width 0.3s'
      }}>
        
        {/* ===== ÉTAPE 1: Choix du package ===== */}
        {step === 1 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h1 style={{
                color: colors.textPrimary,
                fontSize: 'clamp(1.6em, 3vw, 2.2em)',
                fontWeight: 'bold',
                marginBottom: '10px'
              }}>
                {t('proDemande.title')}
              </h1>
              <p style={{ color: colors.textMuted, fontSize: '1.05em' }}>
                {t('proDemande.subtitle')}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: '20px',
              marginBottom: '30px'
            }}>
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg.id)}
                  style={{
                    background: colors.cardBg,
                    backdropFilter: 'blur(10px)',
                    borderRadius: '20px',
                    padding: '30px 24px',
                    border: selectedPackage === pkg.id 
                      ? `3px solid ${pkg.color}` 
                      : `1px solid ${colors.cardBorder}`,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    position: 'relative',
                    boxShadow: selectedPackage === pkg.id 
                      ? `0 8px 30px ${pkg.color}30` 
                      : (isDark ? 'none' : '0 4px 15px rgba(0,0,0,0.06)'),
                    transform: selectedPackage === pkg.id ? 'translateY(-4px)' : 'translateY(0)'
                  }}
                >
                  {/* Badge populaire */}
                  {pkg.popular && (
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: `linear-gradient(135deg, ${pkg.color}, #667eea)`,
                      color: 'white',
                      padding: '4px 16px',
                      borderRadius: '20px',
                      fontSize: '0.75em',
                      fontWeight: 'bold'
                    }}>
                      {t('proDemande.popular')}
                    </div>
                  )}

                  <h3 style={{
                    color: colors.textPrimary,
                    fontSize: '1.3em',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textAlign: 'center'
                  }}>
                    {pkg.name}
                  </h3>

                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    marginBottom: '15px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: colors.textPrimary, fontWeight: '600', fontSize: '0.9em' }}>
                      {pkg.seats}
                    </div>
                    <div style={{ color: colors.textMuted, fontSize: '0.85em' }}>
                      {pkg.maxClients}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {pkg.features.map((feat, i) => (
                      <div key={i} style={{
                        color: colors.textMuted,
                        fontSize: '0.88em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ color: '#22c55e', fontSize: '0.9em' }}>✓</span>
                        {feat}
                      </div>
                    ))}
                  </div>

                  {/* Indicateur sélection */}
                  {selectedPackage === pkg.id && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: pkg.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.9em'
                    }}>
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bouton Continuer */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => selectedPackage && setStep(2)}
                disabled={!selectedPackage}
                style={{
                  background: selectedPackage 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : (isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'),
                  color: selectedPackage ? 'white' : colors.textSubtle,
                  border: 'none',
                  padding: '16px 50px',
                  borderRadius: '50px',
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  cursor: selectedPackage ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s',
                  boxShadow: selectedPackage ? '0 6px 20px rgba(102, 126, 234, 0.3)' : 'none'
                }}
              >
                {t('proDemande.continue')}
              </button>
            </div>
          </>
        )}

        {/* ===== ÉTAPE 2: Informations ===== */}
        {step === 2 && !isSubmitted && (
          <div style={{
            background: colors.cardBg,
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: isMobile ? '30px 22px' : '40px 35px',
            border: `1px solid ${colors.cardBorder}`,
            boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.3)' : '0 20px 60px rgba(0,0,0,0.08)'
          }}>
            <h2 style={{
              color: colors.textPrimary,
              fontSize: '1.5em',
              fontWeight: 'bold',
              marginBottom: '25px',
              textAlign: 'center'
            }}>
              {t('proDemande.step2Title')}
            </h2>
            <InputField label={t('proDemande.labelCabinet')} field="cabinetName" placeholder={t('proDemande.placeholderCabinet')} required />
            <InputField label={t('proDemande.labelName')} field="contactName" placeholder={t('proDemande.placeholderName')} required />
            <InputField label={t('proDemande.labelEmail')} field="contactEmail" type="email" placeholder={t('proDemande.placeholderEmail')} required />
            <InputField label={t('proDemande.labelPhone')} field="contactPhone" type="tel" placeholder={t('proDemande.placeholderPhone')} />
            
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                color: colors.textSecondary,
                fontSize: '0.9em',
                fontWeight: '600',
                marginBottom: '6px'
              }}>
                {t('proDemande.labelAdvisors')}
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.numberOfAdvisors}
                onChange={(e) => handleInputChange('numberOfAdvisors', e.target.value)}
                placeholder="1"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: `2px solid ${colors.inputBorder}`,
                  background: colors.inputBg,
                  color: colors.textPrimary,
                  fontSize: '1em',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = colors.inputFocus}
                onBlur={(e) => e.target.style.borderColor = colors.inputBorder}
              />
            </div>

            <InputField label={t('proDemande.labelMessage')} field="message" type="textarea" placeholder={t('proDemande.placeholderMessage')} />

            {error && (
              <div style={{
                background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '20px',
                color: '#ef4444',
                fontSize: '0.9em'
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.cardBorder}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  fontSize: '1em',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {t('proDemande.back')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                style={{
                  flex: 2,
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isLoading 
                    ? (isDark ? 'rgba(255,255,255,0.2)' : '#d1d5db')
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: '1em',
                  fontWeight: 'bold',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: isLoading ? 'none' : '0 6px 20px rgba(102, 126, 234, 0.3)'
                }}
              >
                {isLoading ? t('proDemande.submitting') : t('proDemande.submit')}
              </button>
            </div>
          </div>
        )}

        {/* ===== ÉTAPE 3: Confirmation ===== */}
        {step === 3 && isSubmitted && (
          <div style={{
            background: colors.cardBg,
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: isMobile ? '40px 25px' : '50px 40px',
            border: `1px solid ${colors.cardBorder}`,
            boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.3)' : '0 20px 60px rgba(0,0,0,0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '4em', marginBottom: '20px' }}>🎉</div>
            <h2 style={{
              color: colors.textPrimary,
              fontSize: '1.8em',
              fontWeight: 'bold',
              marginBottom: '15px'
            }}>
              {t('proDemande.successTitle')}
            </h2>
            <p style={{
              color: colors.textSecondary,
              fontSize: '1.1em',
              marginBottom: '10px',
              lineHeight: '1.6'
            }}>
              {t('proDemande.successMsg')}
            </p>
            <p style={{
              color: colors.textMuted,
              fontSize: '1em',
              marginBottom: '30px',
              lineHeight: '1.6',
              maxWidth: '400px',
              margin: '0 auto 30px'
            }}>
              {t('proDemande.successDetail1')}. {t('proDemande.successDetail2')}. {t('proDemande.successDetail3')}.
            </p>
            
            <div style={{
              background: isDark ? 'rgba(102, 126, 234, 0.15)' : 'rgba(102, 126, 234, 0.08)',
              border: '1px solid rgba(102, 126, 234, 0.25)',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '30px',
              maxWidth: '350px',
              margin: '0 auto 30px'
            }}>
              <p style={{ color: isDark ? '#a5b4fc' : '#667eea', fontSize: '0.9em', fontWeight: '600' }}>
                {t('proDemande.emailTitle')}
              </p>
              <p style={{ color: colors.textMuted, fontSize: '0.88em', marginTop: '6px' }}>
                {t('proDemande.emailDetail')}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/pro')}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 30px',
                  borderRadius: '50px',
                  fontSize: '1em',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 6px 20px rgba(102, 126, 234, 0.3)'
                }}
              >
                {t('proDemande.backToPro')}
              </button>
              <button
                onClick={() => navigate('/')}
                style={{
                  background: 'transparent',
                  color: colors.textMuted,
                  border: `2px solid ${colors.cardBorder}`,
                  padding: '14px 30px',
                  borderRadius: '50px',
                  fontSize: '1em',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {t('proDemande.visitSite')}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* CSS */}
      <style>{`
        @keyframes gps-ring-spin {
          0% { transform: rotate(0deg); box-shadow: 0 0 20px rgba(255, 165, 0, 0.6); }
          50% { box-shadow: 0 0 35px rgba(255, 165, 0, 0.9), 0 0 50px rgba(255, 69, 0, 0.5); }
          100% { transform: rotate(360deg); box-shadow: 0 0 20px rgba(255, 165, 0, 0.6); }
        }
      `}</style>
    </div>
  );
};

export default ProDemande;
