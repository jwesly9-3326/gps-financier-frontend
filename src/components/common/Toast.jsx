import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

const Toast = ({
  message,
  type = 'info',
  duration = 4000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animation d'entrée
    setTimeout(() => setIsVisible(true), 10);
    
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(onClose, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 300);
  };

  const typeConfig = {
    success: {
      background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
      icon: '✓',
      borderColor: '#27ae60'
    },
    error: {
      background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
      icon: '✕',
      borderColor: '#e74c3c'
    },
    warning: {
      background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
      icon: '⚠️',
      borderColor: '#f39c12'
    },
    info: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      icon: 'ℹ️',
      borderColor: '#667eea'
    },
  };

  const config = typeConfig[type] || typeConfig.info;
  
  // Mode compact si le message est très court (ex: juste un check)
  const isCompact = message.length <= 3;

  return (
    <>
      <style>{`
        @keyframes toast-slide-in {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes toast-slide-out {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100px);
          }
        }
      `}</style>
      
      <div 
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          padding: isCompact ? '15px 20px' : '18px 25px',
          borderRadius: '16px',
          background: config.background,
          color: 'white',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: isCompact ? '10px' : '15px',
          minWidth: isCompact ? 'auto' : '250px',
          maxWidth: '450px',
          animation: isLeaving 
            ? 'toast-slide-out 0.3s ease-in forwards'
            : isVisible 
              ? 'toast-slide-in 0.3s ease-out forwards'
              : 'none',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateX(0)' : 'translateX(100px)',
          transition: 'opacity 0.3s, transform 0.3s'
        }}
      >
        {/* Icône - masquée en mode compact */}
        {!isCompact && (
          <span style={{ 
            fontSize: '1.5em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '35px',
            height: '35px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%'
          }}>
            {config.icon}
          </span>
        )}
        
        {/* Message */}
        <p style={{ 
          fontWeight: '600',
          fontSize: isCompact ? '1.3em' : '1em',
          margin: 0,
          flex: isCompact ? 'none' : 1,
          lineHeight: '1.4'
        }}>
          {message}
        </p>
        
        {/* Bouton fermer */}
        <button
          onClick={handleClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            fontSize: '1.3em',
            cursor: 'pointer',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          ×
        </button>
      </div>
    </>
  );
};

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  duration: PropTypes.number,
  onClose: PropTypes.func.isRequired,
};

export default Toast;
