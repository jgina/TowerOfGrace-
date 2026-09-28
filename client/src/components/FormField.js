import { cloneElement, isValidElement, useId } from 'react';

/**
 * Label + control + hint/error wrapper. Pass the input element as children;
 * id, aria-invalid and aria-describedby are wired automatically.
 */
export default function FormField({ label, required, hint, error, className = '', children }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id || id,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': describedBy,
        required: children.props.required ?? required,
      })
    : children;

  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field__label" htmlFor={children?.props?.id || id}>
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {control}
      {error ? (
        <span className="field__error" id={`${id}-error`}>
          {error}
        </span>
      ) : (
        hint && (
          <span className="field__hint" id={`${id}-hint`}>
            {hint}
          </span>
        )
      )}
    </div>
  );
}
