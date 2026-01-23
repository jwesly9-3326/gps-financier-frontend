// 👤 USER INFO - Étape 1 de l'onboarding Pl4to

import { useOnboarding } from '../../context/OnboardingContext';
import NavigationButtons from '../../components/onboarding/NavigationButtons';

const UserInfo = () => {
  const { formData, updateUserInfo, validateStep } = useOnboarding();
  const userInfo = formData.userInfo;

  const handleChange = (field, value) => {
    updateUserInfo(field, value);
  };

  return (
    <div style={{
      minHeight: '100vh',
      paddingBottom: '60px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
      {/* En-tête */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <div style={{
          display: 'inline-block',
          padding: '10px 20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '10px',
          marginBottom: '15px'
        }}>
          <span style={{
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.9em'
          }}>
            Étape 1/6
          </span>
        </div>
        
        <h1 style={{
          fontSize: '2em',
          fontWeight: 'bold',
          color: '#2c3e50',
          marginBottom: '10px',
          fontFamily: "'Poppins', sans-serif"
        }}>
          👤 Parlez-nous de vous
        </h1>
        
        <p style={{
          fontSize: '1em',
          color: '#7f8c8d',
          lineHeight: '1.6'
        }}>
          Ces informations nous permettront de personnaliser votre expérience Pl4to
        </p>
      </div>

      {/* Formulaire dans une carte */}
      <div style={{
        background: 'white',
        borderRadius: '15px',
        padding: '40px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #e0e0e0'
      }}>
        {/* Nom complet */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            fontWeight: '600',
            color: '#2c3e50',
            marginBottom: '8px',
            fontSize: '0.95em'
          }}>
            Nom complet <span style={{ color: '#e74c3c' }}>*</span>
          </label>
          <input
            type="text"
            value={userInfo.nom}
            onChange={(e) => handleChange('nom', e.target.value)}
            placeholder="Ex: Jean Tremblay"
            style={{
              width: '100%',
              padding: '12px 15px',
              fontSize: '1em',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              transition: 'border 0.3s',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />
        </div>

        {/* Âge */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            fontWeight: '600',
            color: '#2c3e50',
            marginBottom: '8px',
            fontSize: '0.95em'
          }}>
            Âge <span style={{ color: '#e74c3c' }}>*</span>
          </label>
          <input
            type="number"
            min="18"
            max="100"
            value={userInfo.age}
            onChange={(e) => handleChange('age', e.target.value)}
            placeholder="Ex: 35"
            style={{
              width: '100%',
              padding: '12px 15px',
              fontSize: '1em',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              transition: 'border 0.3s',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />
          <small style={{ color: '#7f8c8d', fontSize: '0.85em', marginTop: '5px', display: 'block' }}>
            Vous devez avoir au moins 18 ans
          </small>
        </div>

        {/* Situation familiale */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            fontWeight: '600',
            color: '#2c3e50',
            marginBottom: '8px',
            fontSize: '0.95em'
          }}>
            Situation familiale <span style={{ color: '#e74c3c' }}>*</span>
          </label>
          <select
            value={userInfo.situationFamiliale}
            onChange={(e) => handleChange('situationFamiliale', e.target.value)}
            style={{
              width: '100%',
              padding: '12px 15px',
              fontSize: '1em',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              transition: 'border 0.3s',
              outline: 'none',
              background: 'white',
              cursor: 'pointer'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          >
            <option value="">Sélectionnez...</option>
            <option value="celibataire">Célibataire</option>
            <option value="couple">En couple</option>
            <option value="marie">Marié(e)</option>
            <option value="famille">Famille (avec enfants)</option>
          </select>
        </div>

        {/* Personnes à charge */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            fontWeight: '600',
            color: '#2c3e50',
            marginBottom: '8px',
            fontSize: '0.95em'
          }}>
            Nombre de personnes à charge
          </label>
          <input
            type="number"
            min="0"
            max="10"
            value={userInfo.personnesCharge}
            onChange={(e) => handleChange('personnesCharge', e.target.value)}
            placeholder="0"
            style={{
              width: '100%',
              padding: '12px 15px',
              fontSize: '1em',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              transition: 'border 0.3s',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />
          <small style={{ color: '#7f8c8d', fontSize: '0.85em', marginTop: '5px', display: 'block' }}>
            Enfants, personnes âgées ou autres personnes dépendant de vous financièrement
          </small>
        </div>

        {/* Niveau de littératie financière */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            fontWeight: '600',
            color: '#2c3e50',
            marginBottom: '8px',
            fontSize: '0.95em'
          }}>
            Niveau de confort avec la gestion financière <span style={{ color: '#e74c3c' }}>*</span>
          </label>
          <select
            value={userInfo.litteratieFinanciere}
            onChange={(e) => handleChange('litteratieFinanciere', e.target.value)}
            style={{
              width: '100%',
              padding: '12px 15px',
              fontSize: '1em',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              transition: 'border 0.3s',
              outline: 'none',
              background: 'white',
              cursor: 'pointer'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          >
            <option value="">Sélectionnez...</option>
            <option value="debutant">Débutant (je découvre)</option>
            <option value="intermediaire">Intermédiaire (je connais les bases)</option>
            <option value="avance">Avancé (je maîtrise bien)</option>
          </select>
        </div>

        {/* Objectif principal */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            fontWeight: '600',
            color: '#2c3e50',
            marginBottom: '8px',
            fontSize: '0.95em'
          }}>
            Quel est votre objectif principal avec Pl4to? <span style={{ color: '#e74c3c' }}>*</span>
          </label>
          <select
            value={userInfo.objectifPrincipal}
            onChange={(e) => {
              handleChange('objectifPrincipal', e.target.value);
              if (e.target.value !== 'autre') {
                handleChange('objectifAutre', '');
              }
            }}
            style={{
              width: '100%',
              padding: '12px 15px',
              fontSize: '1em',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              transition: 'border 0.3s',
              outline: 'none',
              background: 'white',
              cursor: 'pointer'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          >
            <option value="">Sélectionnez...</option>
            <option value="endettement">Sortir de l'endettement</option>
            <option value="epargne">Épargner pour un projet</option>
            <option value="investissement">Investir pour la retraite</option>
            <option value="budget">Optimiser mon budget</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        {/* Champ "Autre" conditionnel */}
        {userInfo.objectifPrincipal === 'autre' && (
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '8px',
              fontSize: '0.95em'
            }}>
              Précisez votre objectif
            </label>
            <input
              type="text"
              value={userInfo.objectifAutre}
              onChange={(e) => handleChange('objectifAutre', e.target.value)}
              placeholder="Décrivez votre objectif principal..."
              style={{
                width: '100%',
                padding: '12px 15px',
                fontSize: '1em',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                transition: 'border 0.3s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>
        )}

        {/* Message d'aide */}
        <div style={{
          background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
          padding: '15px 20px',
          borderRadius: '10px',
          border: '2px solid #2196f3',
          marginTop: '30px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'start',
            gap: '12px'
          }}>
            <span style={{ fontSize: '1.5em' }}>💡</span>
            <div>
              <p style={{
                fontSize: '0.9em',
                fontWeight: '600',
                color: '#1565c0',
                margin: '0 0 5px 0'
              }}>
                Ces informations sont modifiables
              </p>
              <p style={{
                fontSize: '0.85em',
                color: '#1976d2',
                margin: 0,
                lineHeight: '1.5'
              }}>
                Vous pourrez mettre à jour votre profil à tout moment depuis les paramètres de Pl4to
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Boutons de navigation */}
      <NavigationButtons 
        nextLabel="Suivant"
        backLabel="Retour"
      />
      </div>
    </div>
  );
};

export default UserInfo;