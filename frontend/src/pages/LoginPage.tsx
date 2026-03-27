import { LoginForm } from '@/modules/auth/LoginForm';
import { useLogin, getLoginError } from '@/queries/auth/useLogin';
import type { LoginRequest } from '@/types/auth.types';

const LoginPage = () => {
  const { mutate: login, isPending, error } = useLogin();

  const handleLogin = (payload: LoginRequest) => login(payload);

  return (
    <LoginForm
      onSubmit={handleLogin}
      isLoading={isPending}
      error={getLoginError(error)}
    />
  );
};

export default LoginPage;
