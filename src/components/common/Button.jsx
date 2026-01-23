import PropTypes from 'prop-types';

const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-all focus:outline-none focus:ring-2';
  
  const variantClasses = {
    primary: 'bg-primary-main text-white hover:bg-primary-dark focus:ring-primary-light',
    outline: 'border-2 border-primary-main text-primary-main hover:bg-primary-light',
    danger: 'bg-danger-main text-white hover:bg-danger-dark',
  };

  const disabledClasses = 'opacity-50 cursor-not-allowed';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${disabled || loading ? disabledClasses : ''}
        ${className}
      `.trim()}
      {...props}
    >
      {loading ? 'Chargement...' : children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  type: PropTypes.string,
  variant: PropTypes.oneOf(['primary', 'outline', 'danger']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  className: PropTypes.string,
};

export default Button;