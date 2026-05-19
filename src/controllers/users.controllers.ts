import { Request, Response, RequestHandler, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ObjectId } from 'mongodb';
import { UserVerifyStatus } from '~/constants/enums';
import { HTTP_STATUS } from '~/constants/httpStatus';
import { USERS_MESSAGE } from '~/constants/messages';
import {
  forgotPasswordReqBody,
  LoginReqBody,
  LogoutReqBody,
  RegisterReqBody,
  ResetPasswordReqBody,
  TokenPayload,
  verifyEmailReqBody,
  verifyForgotPasswordTokenReqBody
} from '~/models/requests/User.requests';
import User from '~/models/schemas/User.schema';
import databaseService from '~/services/database.services';
import usersService from '~/services/users.services';

export const loginController = async (req: Request<ParamsDictionary, any, LoginReqBody>, res: Response) => {
  const user = req.user as User;

  if (!user._id) {
    throw new Error('User ID missing');
  }

  const user_id = user._id as ObjectId;

  const result = await usersService.login(user_id.toString());

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
  const { _id } = req.user as User;

  const result = await usersService.forgotPassword((_id as ObjectId).toString());

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
