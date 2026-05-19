import { JwtPayload } from 'jsonwebtoken';
import { TokenType } from '~/constants/enums';

export interface LoginReqBody {
  email: string;
  password: string;
}

export interface RegisterReqBody {
  email: string;
  password: string;
  confirm_password: string;
  date_of_birth: string;
  name: string;
}

export interface TokenPayload extends JwtPayload {
  user_id: string;
  token_type: TokenType;
}

export interface LogoutReqBody {
  refresh_token: string;
}

export interface verifyEmailReqBody {
  email_verify_token: string;
}

export interface verifyForgotPasswordTokenReqBody {
  forgot_password_token: string;
}

export interface forgotPasswordReqBody {
  email: string;
}

export interface ResetPasswordReqBody {
  password: string;
  confirm_password: string;
  forgot_password_token: string;
}
