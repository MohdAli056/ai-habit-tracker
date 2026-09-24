const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin({ email, password }) {
  const errors = {};

  if (!email.trim()) {
    errors.email = 'Enter your email address.';
  } else if (!emailPattern.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Enter your password.';
  }

  return errors;
}

export function validateRegistration({ name, email, password, confirmPassword }) {
  const errors = validateLogin({ email, password });

  if (!name.trim()) {
    errors.name = 'Enter your name.';
  }

  if (password && password.length < 6) {
    errors.password = 'Use at least 6 characters for your password.';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Confirm your password.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}
