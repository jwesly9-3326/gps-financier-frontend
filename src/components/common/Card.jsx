import PropTypes from 'prop-types';

const Card = ({
  children,
  title,
  subtitle,
  footer,
  hoverable = false,
  className = '',
  onClick,
}) => {
  const cardClasses = `
    bg-white rounded-lg shadow-md p-6 transition-all
    ${hoverable ? 'hover:shadow-lg hover:scale-105 cursor-pointer' : ''}
    ${className}
  `.trim();

  return (
    <div className={cardClasses} onClick={onClick}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-xl font-header font-semibold text-text-primary">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-text-secondary mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      <div className="card-content">
        {children}
      </div>
      
      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  footer: PropTypes.node,
  hoverable: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func,
};

export default Card;