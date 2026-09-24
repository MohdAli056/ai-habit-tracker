import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { validateRegistration } from '../utils/authValidation.js';

const initialValues = { name: '', email: '', password: '', confirmPassword: '' };

export function RegisterPage() {
  const { register } = useAuth();
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

    const nextErrors = validateRegistration(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setServerError('');

    try {
      await register(values.name, values.email, values.password);
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
      eyebrow="Create your space"
      title="Start with one small promise."
      description="Create your Cadence account to begin tracking your habits."
      footer={
        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login">
            Log in <ArrowRight size={14} aria-hidden="true" />
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
          label="Name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="How should we call you?"
          value={values.name}
          onChange={handleChange}
          error={errors.name}
        />
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
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
        />
        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={values.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />
        <Button type="submit" fullWidth size="lg" loading={loading} disabled={loading}>
          Create my account <ArrowRight size={17} aria-hidden="true" />
        </Button>
      </form>
    </AuthLayout>
  );
}
