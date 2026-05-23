import { JwtPayload } from 'jsonwebtoken';
import { TokenType, UserVerifyStatus } from '~/constants/enums';
import { ParamsDictionary } from 'express-serve-static-core';

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
  verify_status?: UserVerifyStatus;
}

export interface LogoutReqBody {
  refresh_token: string;
}

export interface RefreshTokenReqBody {
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

export interface UpdateMeReqBody {
  name?: string;
  date_of_birth?: string;
  bio?: string;
  location?: string;
  website?: string;
  username?: string;
  avatar_url?: string;
  cover_photo_url?: string;
}

export interface GetProfileByUsernameReqParams extends ParamsDictionary {
  username: string;
}

export interface FollowReqBody {
  followed_user_id: string;
}

export interface UnfollowReqParams extends ParamsDictionary {
  followed_user_id: string;
}

export interface ChangePasswordReqBody {
  old_password: string;
  new_password: string;
  confirm_new_password: string;
}
