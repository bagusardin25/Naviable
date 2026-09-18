import React from 'react';

type AccessibleToggleProps = {
  id?: string;
  label: string;
  text: string;
  checked: boolean;
  onChange: () => void;
};

export function AccessibleToggle({ id, label, text, checked, onChange }: AccessibleToggleProps) {
  return (
    <div className="setting-row">
      <div className="setting-copy">
        <strong>{label}</strong>
        <span>{text}</span>
      </div>
      <button
        id={id}
        type="button"
        className={`switch ${checked ? 'is-on' : ''}`}
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      >
        <span>{checked ? 'AKTIF' : 'MATI'}</span>
        <i />
      </button>
    </div>
  );
}
