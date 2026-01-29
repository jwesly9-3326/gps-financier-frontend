// 🏦 AccountPickerModal - Sélection de compte style modal
// 🌍 i18n enabled

import { useTranslation } from 'react-i18next';

const AccountPickerModal = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  accounts = [],
  selectedAccount = '',
  title = null 
}) => {
  const { t, i18n } = useTranslation();

  if (!isOpen) return null;

  const formatMontant = (montant) => {
    return new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', { 
      style: 'currency', 
      currency: 'CAD' 
    }).format(Math.abs(montant));
  };

  const getAccountIcon = (type) => {
    switch (type) {
      case 'cheque': return '💳';
      case 'epargne': return '🌱';
      case 'credit': return '🏦';
      case 'hypotheque': return '🏠';
      default: return '💳';
    }
  };

  const getAccountColor = (type) => {
    switch (type) {
      case 'cheque': return '#3498db';
      case 'epargne': return '#27ae60';
      case 'credit': return '#f39c12';
      case 'hypotheque': return '#9b59b6';
      default: return '#3498db';
    }
  };

  const getAccountTypeLabel = (type) => {
    switch (type) {
      case 'cheque': return t('accounts.types.checking', 'Compte chèque');
      case 'epargne': return t('accounts.types.savings', 'Compte épargne');
      case 'credit': return t('accounts.types.credit', 'Carte de crédit');
      case 'hypotheque': return t('accounts.types.mortgage', 'Hypothèque');
      default: return t('accounts.types.account', 'Compte');
    }
  };

  const handleSelect = (accountName) => {
    onSelect(accountName);
    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '25px',
          width: '100%',
          maxWidth: '400px',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px' 
        }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '1.3em', 
            color: '#2c3e50',
            fontWeight: '700'
          }}>
            {title || t('budget.selectAccount', 'Sélectionner un compte')}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5em',
              cursor: 'pointer',
              color: '#7f8c8d',
              padding: '5px',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Liste des comptes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {accounts.length === 0 ? (
            <p style={{ 
              textAlign: 'center', 
              color: '#7f8c8d', 
              padding: '30px',
              fontSize: '0.95em'
            }}>
              {t('budget.noAccounts', 'Aucun compte disponible')}
            </p>
          ) : (
            accounts.map((account, index) => {
              const isSelected = account.nom === selectedAccount;
              const accentColor = getAccountColor(account.type);
              
              return (
                <button
                  key={index}
                  onClick={() => handleSelect(account.nom)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '15px 18px',
                    borderRadius: '12px',
                    border: `3px solid ${isSelected ? accentColor : '#e0e0e0'}`,
                    background: isSelected ? `${accentColor}15` : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    width: '100%',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = accentColor;
                      e.currentTarget.style.background = `${accentColor}10`;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 4px 15px ${accentColor}30`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#e0e0e0';
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {/* Icône et infos */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '45px',
                      height: '45px',
                      borderRadius: '10px',
                      background: `${accentColor}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4em'
                    }}>
                      {getAccountIcon(account.type)}
                    </div>
                    <div>
                      <div style={{ 
                        fontWeight: '700', 
                        fontSize: '1em', 
                        color: '#2c3e50',
                        marginBottom: '2px'
                      }}>
                        {account.nom}
                      </div>
                      <div style={{ 
                        fontSize: '0.8em', 
                        color: '#7f8c8d' 
                      }}>
                        {getAccountTypeLabel(account.type)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountPickerModal;
