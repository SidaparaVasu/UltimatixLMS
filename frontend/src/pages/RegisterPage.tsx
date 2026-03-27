import { RegisterForm } from '@/modules/auth/RegisterForm';
import { useRegister, getRegisterError } from '@/queries/auth/useRegister';
import type { RegisterRequest } from '@/types/auth.types';

const RegisterPage = () => {
  const { mutate: register, isPending, error } = useRegister();

  const handleRegister = (payload: RegisterRequest) => {
    register(payload);
  };

  return (
    <RegisterForm
      onSubmit={handleRegister}
      isLoading={isPending}
      error={getRegisterError(error)}
    />
  );
};

export default RegisterPage;
