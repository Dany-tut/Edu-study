import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from './icons/appIcons'
import FadeText from './FadeText'
import './nativeSelectField.css'

/** Keep the native picker and keyboard behavior with a consistent visible field. */
export default function NativeSelectField({ displayValue, className = '', style, children, ...props }:
  SelectHTMLAttributes<HTMLSelectElement> & { displayValue: string }) {
  return <span className={`native-select-field ${className}`} style={style} data-disabled={props.disabled || undefined}>
    <span className="native-select-field-value" aria-hidden="true"><FadeText>{displayValue}</FadeText></span>
    <ChevronDown className="native-select-field-chevron" size={16} aria-hidden="true" />
    <select {...props} className="native-select-field-input">{children}</select>
  </span>
}
