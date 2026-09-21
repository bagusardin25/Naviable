export type AuthMode = 'signin' | 'signup';

type AuthModeSwitchProps = {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
  className: string;
  buttonClassName: string;
  activeClassName: string;
  signupLabel?: string;
};

export function AuthModeSwitch({
  mode,
  onChange,
  className,
  buttonClassName,
  activeClassName,
  signupLabel = 'Daftar Akun',
}: AuthModeSwitchProps) {
  return (
    <div className={className} role="group" aria-label="Pilih masuk atau daftar akun">
      <button
        type="button"
        aria-pressed={mode === 'signin'}
        className={`${buttonClassName} ${mode === 'signin' ? activeClassName : ''}`}
        onClick={() => onChange('signin')}
      >
        Masuk
      </button>
      <button
        type="button"
        aria-pressed={mode === 'signup'}
        className={`${buttonClassName} ${mode === 'signup' ? activeClassName : ''}`}
        onClick={() => onChange('signup')}
      >
        {signupLabel}
      </button>
    </div>
  );
}
