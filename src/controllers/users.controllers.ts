import { config } from 'dotenv';
import { Request, Response, RequestHandler, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ObjectId } from 'mongodb';
import { UserVerifyStatus } from '~/constants/enums';
import { HTTP_STATUS } from '~/constants/httpStatus';
import { USERS_MESSAGE } from '~/constants/messages';
import {
  ChangePasswordReqBody,
  FollowReqBody,
  forgotPasswordReqBody,
  GetProfileByUsernameReqParams,
  LoginReqBody,
  LogoutReqBody,
  RefreshTokenReqBody,
  RegisterReqBody,
  ResetPasswordReqBody,
  TokenPayload,
  UnfollowReqParams,
  UpdateMeReqBody,
  verifyEmailReqBody,
  verifyForgotPasswordTokenReqBody
} from '~/models/requests/User.requests';
import User from '~/models/schemas/User.schema';
import databaseService from '~/services/database.services';
import usersService from '~/services/users.services';
config();
export const loginController = async (req: Request<ParamsDictionary, any, LoginReqBody>, res: Response) => {
  const user = req.user as User;

  if (!user._id) {
    throw new Error('User ID missing');
  }

  const user_id = user._id as ObjectId;

  const result = await usersService.login({ user_id: user_id.toString(), verify_status: user.verify_status });

  res.status(200).json({
    message: USERS_MESSAGE.LOGIN_SUCCESS,
    result
  });
  return;
};

export const registerController: RequestHandler = async (
  req: Request<ParamsDictionary, any, RegisterReqBody>,
  res: Response,
  next: NextFunction
) => {
  const result = await usersService.register(req.body);

  res.status(201).json({
    message: USERS_MESSAGE.REGISTRATION_SUCCESS,
    result
  });
  return;
};

export const logoutController: RequestHandler = async (
  req: Request<ParamsDictionary, any, LogoutReqBody>,
  res: Response
) => {
  const { refresh_token } = req.body;

  const result = await usersService.logout(refresh_token);

  res.json(result);
  return;
};

export const refreshTokenController: RequestHandler = async (
  req: Request<ParamsDictionary, any, RefreshTokenReqBody>,
  res: Response
) => {
  const { refresh_token } = req.body;
  const { user_id, verify_status } = req.decoded_refresh_token as TokenPayload;

  const result = await usersService.refreshToken({ user_id, verify_status, refresh_token });

  res.json({
    message: USERS_MESSAGE.REFRESH_TOKEN_SUCCESS,
    result
  });
  return;
};

export const verifyEmailController: RequestHandler = async (
  req: Request<ParamsDictionary, any, verifyEmailReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_email_verify_token as TokenPayload;

  const user = await databaseService.users.findOne({
    _id: new ObjectId(user_id)
  });

  if (!user) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      message: USERS_MESSAGE.USER_NOT_FOUND
    });
  }

  //verified
  if (user?.email_verify_token === '') {
    res.json({
      message: USERS_MESSAGE.EMAIL_ALREADY_VERIFIED
    });
  }

  const result = await usersService.verifyEmail(user_id);

  res.json({
    message: USERS_MESSAGE.EMAIL_VERIFICATION_SUCCESS,
    result
  });
  return;
};

export const resendVerifyEmailController: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  const user = await databaseService.users.findOne({
    _id: new ObjectId(user_id)
  });

  if (!user) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      message: USERS_MESSAGE.USER_NOT_FOUND
    });
  }

  //verified
  if (user?.verify_status === UserVerifyStatus.Verified) {
    res.json({
      message: USERS_MESSAGE.EMAIL_ALREADY_VERIFIED
    });
  }

  const result = await usersService.resendVerifyEmail(user_id);

  res.json(result);
  return;
};

export const forgotPasswordController: RequestHandler = async (
  req: Request<ParamsDictionary, any, forgotPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { _id, verify_status } = req.user as User;

  const result = await usersService.forgotPassword({
    user_id: (_id as ObjectId).toString(),
    verify_status
  });

  res.json(result);
  return;
};

export const verifyForgotPasswordTokenController: RequestHandler = async (
  req: Request<ParamsDictionary, any, verifyForgotPasswordTokenReqBody>,
  res: Response,
  next: NextFunction
) => {
  res.json({
    message: USERS_MESSAGE.VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS
  });
  return;
};

export const resetPasswordController: RequestHandler = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_forgot_password_token as TokenPayload;

  const { password } = req.body;

  const result = await usersService.resetPassword(user_id, password);

  res.json(result);
  return;
};

export const getMeController: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  const user = await usersService.getMe(user_id);

  res.json({
    message: USERS_MESSAGE.GET_PROFILE_SUCCESS,
    result: user
  });

  return;
};

export const updateMeController: RequestHandler = async (
  req: Request<ParamsDictionary, any, UpdateMeReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  // const body = pick(req.body, [
  //   'name',
  //   'date_of_birth',
  //   'bio',
  //   'location',
  //   'website',
  //   'username',
  //   'avatar_url',
  //   'cover_photo_url'
  // ]);

  const { body } = req;

  const user = await usersService.updateMe(user_id, body);

  res.json({
    message: USERS_MESSAGE.UPDATE_ME_SUCCESS,
    result: user
  });

  return;
};

export const getProfileByUsernameController = async (
  req: Request<GetProfileByUsernameReqParams>,
  res: Response,
  next: NextFunction
) => {
  const { username } = req.params;

  const user = await usersService.getProfileByUsername(username);

  res.json({
    message: USERS_MESSAGE.GET_PROFILE_SUCCESS,
    result: user
  });
};

export const followController = async (
  req: Request<ParamsDictionary, any, FollowReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  const { followed_user_id } = req.body;

  const result = await usersService.follow(user_id, followed_user_id);

  res.json(result);
  return;
};

export const unfollowController = async (req: Request<UnfollowReqParams>, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  const { followed_user_id } = req.params;

  const result = await usersService.unfollow(user_id, followed_user_id);

  res.json(result);
  return;
};

export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  const { new_password } = req.body;

  const result = await usersService.changePassword(user_id, new_password);

  res.json(result);
  return;
};

export const googleOAuthController: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { code } = req.query;
  const result = await usersService.oauthGoogle(code as string);
  const urlRedirect = `${process.env.CLIENT_REDIRECT_URI}?access_token=${result.access_token}
  &refresh_token=${result.refresh_token}&new_user=${result.newUser}&verify_status=${result.verify_status}`;

  res.redirect(urlRedirect);

  return;
};
