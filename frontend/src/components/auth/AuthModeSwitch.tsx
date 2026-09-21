export type AuthMode = 'signin' | 'signup';

type AuthModeSwitchProps = {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
  className: string;
  buttonClassName: string;
  activeClassName: string;
  signinLabel?: string;
  signupLabel?: string;
  ariaLabel?: string;
};

export function AuthModeSwitch({
  mode,
  onChange,
  className,
  buttonClassName,
  activeClassName,
  signinLabel = 'Masuk',
  signupLabel = 'Daftar Akun',
  ariaLabel = 'Pilih masuk atau daftar akun',
}: AuthModeSwitchProps) {
  return (
    <div className={className} role="tablist" aria-label={ariaLabel}>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'signin'}
        className={`${buttonClassName} ${mode === 'signin' ? activeClassName : ''}`}
        onClick={() => onChange('signin')}
      >
        {signinLabel}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'signup'}
        className={`${buttonClassName} ${mode === 'signup' ? activeClassName : ''}`}
        onClick={() => onChange('signup')}
      >
        {signupLabel}
      </button>
    </div>
  );
}
