import PropTypes from 'prop-types';

const Loading = ({ 
  size = 'md', 
  fullScreen = false,
  message = 'Chargement...'
}) => {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="animate-pulse-gps">
        <span className={sizeClasses[size]}>⭕</span>
      </div>
      {message && (
        <p className="text-text-secondary animate-pulse">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

Loading.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullScreen: PropTypes.bool,
  message: PropTypes.string,
};

export default Loading;