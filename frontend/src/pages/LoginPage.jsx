import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { validateLogin } from '../utils/authValidation.js';

const initialValues = { email: '', password: '' };

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setServerError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setServerError('');

    try {
      await login(values.email, values.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(
        err.response?.data?.message || 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Return to your rhythm."
      description="Sign in to your Cadence account to continue your progress."
      footer={
        <p className="auth-footer-text">
          New to Cadence?{' '}
          <Link to="/register">
            Create an account <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <p className="form-alert" role="alert">
            {serverError}
          </p>
        )}
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={handleChange}
          error={errors.email}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
        />
        <Button type="submit" fullWidth size="lg" loading={loading} disabled={loading}>
          Continue <ArrowRight size={17} aria-hidden="true" />
        </Button>
      </form>
    </AuthLayout>
  );
}
