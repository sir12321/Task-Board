import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './RegisterPage.module.css';
import { apiClient } from '../../utils/api';

function RegisterPage() {
  const nameInputId = 'register-name';
  const emailInputId = 'register-email';
  const passwordInputId = 'register-password';
  const confirmPasswordInputId = 'register-confirm-password';
  const errorMessageId = 'register-error-message';
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (
    e: React.SyntheticEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);

    try {
      await apiClient('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      navigate('/login');
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (
          err.message.toLowerCase().includes('already exists') ||
          err.message.toLowerCase().includes('already in use')
        ) {
          setError('This email address already exists.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred during registration.');
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Register</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor={nameInputId}>Name</label>
            <input
              id={nameInputId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-required="true"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorMessageId : undefined}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor={emailInputId}>Email</label>
            <input
              id={emailInputId}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorMessageId : undefined}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor={passwordInputId}>Password</label>
            <input
              id={passwordInputId}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorMessageId : undefined}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor={confirmPasswordInputId}>Confirm Password</label>
            <input
              id={confirmPasswordInputId}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              aria-required="true"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorMessageId : undefined}
            />
          </div>

          {error && (
            <p
              id={errorMessageId}
              className={styles.error}
              role="alert"
              aria-live="assertive"
            >
              {error}
            </p>
          )}

          <button type="submit" className={styles.button}>
            Register
          </button>
        </form>

        <p className={styles.footerText}>
          Already have an account?{' '}
          <Link to="/login" className={styles.link}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
