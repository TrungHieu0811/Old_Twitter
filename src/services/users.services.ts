import User from '~/models/schemas/User.schema';
import databaseService from './database.services';
import { RegisterReqBody, UpdateMeReqBody } from '~/models/requests/User.requests';
import { hashPassword } from '~/utils/crypto';
import { signToken } from '~/utils/jwt';
import { TokenType, UserVerifyStatus } from '~/constants/enums';
import jwt from 'jsonwebtoken';
import RefreshToken from '~/models/schemas/RefreshToken.schema';
import { ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { USERS_MESSAGE } from '~/constants/messages';
import { ErrorWithStatus } from '~/models/Errors';
import { HTTP_STATUS } from '~/constants/httpStatus';
import Follower from '~/models/schemas/Follower.schema';
import axios from 'axios';
config();

class UsersService {
  private signAccessToken({ user_id, verify_status }: { user_id: string; verify_status?: UserVerifyStatus }) {
    return signToken({
      payload: { user_id, verify_status, token_type: TokenType.AccessToken },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    });
  }
  private signRefreshToken({ user_id, verify_status }: { user_id: string; verify_status?: UserVerifyStatus }) {
    return signToken({
      payload: { user_id, verify_status, token_type: TokenType.RefreshToken },
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
      options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    });
  }

  private signEmailVerifyToken({ user_id, verify_status }: { user_id: string; verify_status?: UserVerifyStatus }) {
    return signToken({
      payload: { user_id, verify_status, token_type: TokenType.EmailVerifyToken },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      options: { expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    });
  }

  private signForgotPasswordToken({ user_id, verify_status }: { user_id: string; verify_status?: UserVerifyStatus }) {
    return signToken({
      payload: { user_id, verify_status, token_type: TokenType.ForgotPasswordToken },
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
      options: { expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    });
  }

  private signAccessTokenAndRefreshToken({
    user_id,
    verify_status
  }: {
    user_id: string;
    verify_status?: UserVerifyStatus;
  }) {
    return Promise.all([
      this.signAccessToken({ user_id, verify_status }),
      this.signRefreshToken({ user_id, verify_status })
    ]);
  }

  async register(payload: RegisterReqBody) {
    const user_id = new ObjectId();
    const email_verify_token = await this.signEmailVerifyToken({
      user_id: user_id.toString(),
      verify_status: UserVerifyStatus.Unverified
    });
    // Logic for registering a new user
    await databaseService.users.insertOne(
      new User({
        ...payload,
        _id: user_id,
        username: `user_${user_id.toString()}`, // Generate username
        email_verify_token,
        date_of_birth: new Date(payload.date_of_birth),
        password: hashPassword(payload.password)
      })
    );

    const [access_token, refresh_token] = await this.signAccessTokenAndRefreshToken({
      user_id: user_id.toString(),
      verify_status: UserVerifyStatus.Unverified
    });

    await databaseService.refreshTokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: refresh_token })
    );

    return {
      access_token,
      refresh_token
    };
  }

  async checkEmailExists(email: string) {
    const existingUser = await databaseService.users.findOne({ email });
    return Boolean(existingUser);
  }

  async login({ user_id, verify_status }: { user_id: string; verify_status: UserVerifyStatus }) {
    const [access_token, refresh_token] = await this.signAccessTokenAndRefreshToken({
      user_id,
      verify_status
    });

    await databaseService.refreshTokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: refresh_token })
    );

    return {
      access_token,
      refresh_token
    };
  }

  private async getOauthGoogleTokens(code: string) {
    const body = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI as string,
      grant_type: 'authorization_code'
    };

    const { data } = await axios.post('https://oauth2.googleapis.com/token', body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return data as { access_token: string; id_token: string };
  }

  private async getGoogleUserInfo(access_token: string, id_token: string) {
    const { data } = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo`, {
      params: {
        access_token,
        alt: 'json'
      },
      headers: {
        Authorization: `Bearer ${id_token}`
      }
    });
    return data as {
      id: string;
      email: string;
      name: string;
      picture: string;
      verified_email: boolean;
      given_name: string;
      family_name: string;
    };
  }

  async oauthGoogle(code: string) {
    const { access_token, id_token } = await this.getOauthGoogleTokens(code);

    const UserInfo = await this.getGoogleUserInfo(access_token, id_token);

    if (!UserInfo.verified_email) {
      throw new ErrorWithStatus({
        message: USERS_MESSAGE.GOOGLE_EMAIL_NOT_VERIFIED,
        status: HTTP_STATUS.BAD_REQUEST
      });
    }

    const existingUser = await databaseService.users.findOne({ email: UserInfo.email });
    if (existingUser) {
      const [access_token, refresh_token] = await this.signAccessTokenAndRefreshToken({
        user_id: existingUser._id.toString(),
        verify_status: existingUser.verify_status
      });

      await databaseService.refreshTokens.insertOne(
        new RefreshToken({ user_id: new ObjectId(existingUser._id), token: refresh_token })
      );

      return {
        access_token,
        refresh_token,
        newUser: 0,
        verify_status: existingUser.verify_status
      };
    } else {
      const password = Math.random().toString(36).substring(2, 15);

      const data = await this.register({
        email: UserInfo.email,
        password: password, // Generate a random password
        confirm_password: password,
        name: UserInfo.name,
        date_of_birth: new Date().toISOString() // You might want to ask user to provide this info later
      });

      return {
        ...data,
        newUser: 1,
        verify_status: UserVerifyStatus.Unverified
      };
    }
  }

  async logout(refresh_token: string) {
    await databaseService.refreshTokens.deleteOne({ token: refresh_token });

    return {
      message: USERS_MESSAGE.LOGOUT_SUCCESS
    };
  }

  async verifyEmail(user_id: string) {
    const [token] = await Promise.all([
      this.signAccessTokenAndRefreshToken({ user_id, verify_status: UserVerifyStatus.Verified }),
      databaseService.users.updateOne(
        { _id: new ObjectId(user_id) },
        { $set: { email_verify_token: '', verify_status: UserVerifyStatus.Verified, updated_at: new Date() } }
      )
    ]);

    const [access_token, refresh_token] = token;

    await databaseService.refreshTokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: refresh_token })
    );

    return {
      access_token,
      refresh_token
    };
  }

  async resendVerifyEmail(user_id: string) {
    const email_verify_token = await this.signEmailVerifyToken({
      user_id,
      verify_status: UserVerifyStatus.Unverified
    });

    console.log('Resend verify email token:', email_verify_token);

    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      { $set: { email_verify_token, updated_at: new Date() } }
    );

    return {
      message: USERS_MESSAGE.RESEND_VERIFY_EMAIL_SUCCESS
    };
  }

  async forgotPassword({ user_id, verify_status }: { user_id: string; verify_status?: UserVerifyStatus }) {
    const forgot_password_token = await this.signForgotPasswordToken({
      user_id,
      verify_status
    });

    console.log('Forgot password token:', forgot_password_token);

    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      { $set: { forgot_password_token, updated_at: new Date() } }
    );

    return {
      message: USERS_MESSAGE.CHECK_EMAIL_TO_RESET_PASSWORD
    };
  }

  async resetPassword(user_id: string, password: string) {
    databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      { $set: { forgot_password_token: '', password: hashPassword(password), updated_at: new Date() } }
    );

    return {
      message: USERS_MESSAGE.RESET_PASSWORD_SUCCESS
    };
  }

  async getMe(user_id: string) {
    const user = await databaseService.users.findOne(
      { _id: new ObjectId(user_id) },
      { projection: { password: 0, email_verify_token: 0, forgot_password_token: 0 } }
    );

    if (!user) {
      return null;
    }

    return user;
  }

  async updateMe(user_id: string, payload: UpdateMeReqBody) {
    const _payload = payload.date_of_birth ? { ...payload, date_of_birth: new Date(payload.date_of_birth) } : payload;

    const user = await databaseService.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      { $set: { ...(_payload as UpdateMeReqBody & { date_of_birth?: Date }), updated_at: new Date() } },
      { returnDocument: 'after', projection: { password: 0, email_verify_token: 0, forgot_password_token: 0 } }
    );

    return user;
  }

  async getProfileByUsername(username: string) {
    const user = await databaseService.users.findOne(
      { username },
      {
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0,
          verify_status: 0,
          updated_at: 0,
          created_at: 0
        }
      }
    );

    if (!user) {
      throw new ErrorWithStatus({
        message: USERS_MESSAGE.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      });
    }

    return user;
  }

  async follow(user_id: string, followed_user_id: string) {
    const follower = await databaseService.flowers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    });

    if (follower === null) {
      await databaseService.flowers.insertOne(
        new Follower({
          user_id: new ObjectId(user_id),
          followed_user_id: new ObjectId(followed_user_id)
        })
      );

      return {
        message: USERS_MESSAGE.FOLLOW_SUCCESS
      };
    }

    return {
      message: USERS_MESSAGE.FOLLOW_ALREADY
    };
  }

  async unfollow(user_id: string, followed_user_id: string) {
    const follower = await databaseService.flowers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    });

    if (follower === null) {
      return {
        message: USERS_MESSAGE.UNFOLLOW_ALREADY
      };
    }

    await databaseService.flowers.deleteOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    });

    return {
      message: USERS_MESSAGE.UNFOLLOW_SUCCESS
    };
  }

  async changePassword(user_id: string, new_password: string) {
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      { $set: { password: hashPassword(new_password), updated_at: new Date() } }
    );

    return {
      message: USERS_MESSAGE.CHANGE_PASSWORD_SUCCESS
    };
  }
}

const usersService = new UsersService();

export default usersService;
