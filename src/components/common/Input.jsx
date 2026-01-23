import PropTypes from 'prop-types';

const Input = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  disabled = false,
  required = false,
  className = '',
  ...props
}) => {
  const inputClasses = `
    w-full px-4 py-2 border rounded-md transition-all
    focus:outline-none focus:ring-2 focus:ring-primary-light
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${error ? 'border-danger-main focus:ring-danger-light' : 'border-gray-300'}
    ${className}
  `.trim();

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-text-primary mb-1">
          {label}
          {required && <span className="text-danger-main ml-1">*</span>}
        </label>
      )}
      
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={inputClasses}
        {...props}
      />
      
      {error && (
        <p className="mt-1 text-sm text-danger-main">{error}</p>
      )}
    </div>
  );
};

Input.propTypes = {
  label: PropTypes.string,
  type: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
};

export default Input;