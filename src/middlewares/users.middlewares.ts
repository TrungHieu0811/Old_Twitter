import { Request, Response, NextFunction } from 'express';
import { checkSchema, ParamSchema } from 'express-validator';
import { JsonWebTokenError } from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { UserVerifyStatus } from '~/constants/enums';
import { HTTP_STATUS } from '~/constants/httpStatus';
import { USERS_MESSAGE } from '~/constants/messages';
import { REGEX_USERNAME } from '~/constants/regex';
import { ErrorWithStatus } from '~/models/Errors';
import { TokenPayload } from '~/models/requests/User.requests';
import databaseService from '~/services/database.services';
import usersService from '~/services/users.services';
import { hashPassword } from '~/utils/crypto';
import { verifyToken } from '~/utils/jwt';
import { validate } from '~/utils/validation';

const passwordSchema: ParamSchema = {
  notEmpty: {
    errorMessage: USERS_MESSAGE.PASSWORD_REQUIRED
  },
  isString: {
    errorMessage: USERS_MESSAGE.PASSWORD_MUST_BE_STRING
  },
  isStrongPassword: {
    errorMessage: USERS_MESSAGE.STRONG_PASSWORD,
    options: {
      minLength: 6,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    }
  }
};

const confirmPasswordSchema: ParamSchema = {
  notEmpty: {
    errorMessage: USERS_MESSAGE.CONFIRM_PASSWORD_REQUIRED
  },
  isString: {
    errorMessage: USERS_MESSAGE.CONFIRM_PASSWORD_MUST_BE_STRING
  },
  isStrongPassword: {
    errorMessage: USERS_MESSAGE.STRONG_PASSWORD,
    options: {
      minLength: 6,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    }
  },
  custom: {
    options: (value, { req }) => {
      if (value !== req.body.password) {
        throw new Error(USERS_MESSAGE.PASSWORDS_DO_NOT_MATCH);
      }
      return true;
    }
  }
};

const forgot_password_tokenSchema: ParamSchema = {
  trim: true,
  custom: {
    options: async (value, { req }) => {
      if (!value) {
        throw new ErrorWithStatus({
          message: USERS_MESSAGE.FORGOT_PASSWORD_TOKEN_REQUIRED,
          status: HTTP_STATUS.UNAUTHORIZED
        });
      }
      try {
        const decoded_forgot_password_token = await verifyToken({
          token: value,
          secretOrPublicKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string
        });

        const { user_id } = decoded_forgot_password_token as TokenPayload;

        const user = await databaseService.users.findOne({
          _id: new ObjectId(user_id)
        });

        if (!user) {
          throw new ErrorWithStatus({
            message: USERS_MESSAGE.USER_NOT_FOUND,
            status: HTTP_STATUS.NOT_FOUND
          });
        }

        if (user.forgot_password_token !== value) {
          throw new ErrorWithStatus({
            message: USERS_MESSAGE.FORGOT_PASSWORD_TOKEN_INVALID,
            status: HTTP_STATUS.UNAUTHORIZED
          });
        }

        (req as Request).decoded_forgot_password_token = decoded_forgot_password_token; // Attach decoded token to request object for later use in controller
      } catch (error) {
        throw new ErrorWithStatus({
          message: USERS_MESSAGE.FORGOT_PASSWORD_TOKEN_INVALID,
          status: HTTP_STATUS.UNAUTHORIZED
        });
      }

      return true;
    }
  }
};

const nameSchema: ParamSchema = {
  isString: {
    errorMessage: USERS_MESSAGE.NAME_MUST_BE_STRING
  },
  notEmpty: {
    errorMessage: USERS_MESSAGE.NAME_REQUIRED
  },
  trim: true,
  isLength: {
    options: { min: 3, max: 100 },
    errorMessage: USERS_MESSAGE.NAME_LENGTH
  }
};

const dateOfBirthSchema: ParamSchema = {
  isISO8601: {
    options: { strict: true, strictSeparator: true },
    errorMessage: USERS_MESSAGE.INVALID_DATE_OF_BIRTH
  }
};

const imageSchema: ParamSchema = {
  optional: true,
  isString: {
    errorMessage: USERS_MESSAGE.IMAGE_URL_MUST_BE_STRING
  },
  trim: true,
  isLength: {
    options: { min: 1, max: 400 },
    errorMessage: USERS_MESSAGE.IMAGE_URL_LENGTH
  }
};

const followedUserSchema: ParamSchema = {
  custom: {
    options: async (value, { req }) => {
      if (!ObjectId.isValid(value)) {
        throw new ErrorWithStatus({
          message: USERS_MESSAGE.FOLLOWED_USER_ID_INVALID,
          status: HTTP_STATUS.NOT_FOUND
        });
      }

      const followedUser = await databaseService.users.findOne({
        _id: new ObjectId(value)
      });

      if (!followedUser) {
        throw new ErrorWithStatus({
          message: USERS_MESSAGE.FOLLOWED_USER_NOT_FOUND,
          status: HTTP_STATUS.NOT_FOUND
        });
      }
    }
  }
};

export const loginValidator = validate(
  checkSchema(
    {
      email: {
        isEmail: {
          errorMessage: USERS_MESSAGE.INVALID_EMAIL
        },
        trim: true,
        custom: {
          options: async (value, { req }) => {
            // Check if email exists in the database
            const user = await databaseService.users.findOne({
              email: value,
              password: hashPassword(req.body.password)
            });
            if (user === null) {
              throw new Error(USERS_MESSAGE.EMAIL_OR_PASSWORD_INCORRECT);
            }

            req.user = user; // Attach user to request object for later use in controller
            return true;
          }
        }
      },
      password: {
        notEmpty: {
          errorMessage: USERS_MESSAGE.PASSWORD_REQUIRED
        },
        isString: {
          errorMessage: USERS_MESSAGE.PASSWORD_MUST_BE_STRING
        }
      }
    },
    ['body']
  )
);

export const registerValidator = validate(
  checkSchema(
    {
      name: nameSchema,
      email: {
        notEmpty: {
          errorMessage: USERS_MESSAGE.EMAIL_REQUIRED
        },
        isEmail: {
          errorMessage: USERS_MESSAGE.INVALID_EMAIL
        },
        trim: true,
        custom: {
          options: async (value) => {
            // Check if email already exists in the database
            const existingUser = await usersService.checkEmailExists(value);
            if (existingUser) {
              throw new Error(USERS_MESSAGE.EMAIL_ALREADY_EXISTS);
            }
            return true;
          }
        }
      },
      password: passwordSchema,
      confirm_password: confirmPasswordSchema,
      date_of_birth: dateOfBirthSchema
    },
    ['body']
  )
);

export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        trim: true,
        custom: {
          options: async (value: string, { req }) => {
            const access_token = (value || '').split(' ')[1]; // Expecting format "Bearer <token>"
            if (!access_token) {
              throw new ErrorWithStatus({
                message: USERS_MESSAGE.ACCESS_TOKEN_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED
              });
            }
            try {
              const decoded_authorization = await verifyToken({
                token: access_token,
                secretOrPublicKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
              });
              (req as Request).decoded_authorization = decoded_authorization; // Attach decoded token to request object for later use in controller
            } catch (error) {
              throw new ErrorWithStatus({
                message: USERS_MESSAGE.ACCESS_TOKEN_INVALID,
                status: HTTP_STATUS.UNAUTHORIZED
              });
            }
            return true;
          }
        }
      }
    },

    ['headers']
  )
);

export const refeshTokenValidator = validate(
  checkSchema(
    {
      refresh_token: {
        trim: true,
        custom: {
          options: async (value, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: USERS_MESSAGE.REFRESH_TOKEN_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED
              });
            }
            try {
              const [decoded_refresh_token, refresh_token] = await Promise.all([
                verifyToken({ token: value, secretOrPublicKey: process.env.JWT_SECRET_REFRESH_TOKEN as string }),
                databaseService.refreshTokens.findOne({ token: value })
              ]);
              if (refresh_token === null) {
                throw new ErrorWithStatus({
                  message: USERS_MESSAGE.USED_REFRESH_TOKEN_OR_NOT_EXIST,
                  status: HTTP_STATUS.UNAUTHORIZED
                });
              }
              (req as Request).decoded_refresh_token = decoded_refresh_token;
            } catch (error) {
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  message: USERS_MESSAGE.REFRESH_TOKEN_INVALID,
                  status: HTTP_STATUS.UNAUTHORIZED
                });
              }

              throw error;
            }
            return true;
          }
        }
      }
    },
    ['body']
  )
);

export const emailVerifyTokenValidator = validate(
  checkSchema(
    {
      email_verify_token: {
        trim: true,
        custom: {
          options: async (value, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: USERS_MESSAGE.EMAIL_VERIFY_TOKEN_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED
              });
            }
            try {
              const decoded_email_verify_token = await verifyToken({
                token: value,
                secretOrPublicKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string
              });

              (req as Request).decoded_email_verify_token = decoded_email_verify_token;
            } catch (error) {
              throw new ErrorWithStatus({
                message: USERS_MESSAGE.EMAIL_VERIFY_TOKEN_INVALID,
                status: HTTP_STATUS.UNAUTHORIZED
              });
            }

            return true;
          }
        }
      }
    },
    ['body']
  )
);

export const forgotPasswordValidator = validate(
  checkSchema(
    {
      email: {
        isEmail: {
          errorMessage: USERS_MESSAGE.INVALID_EMAIL
        },
        trim: true,
        custom: {
          options: async (value, { req }) => {
            // Check if email exists in the database
            const user = await databaseService.users.findOne({
              email: value
            });
            if (user === null) {
              throw new Error(USERS_MESSAGE.USER_NOT_FOUND);
            }
            req.user = user; // Attach user to request object for later use in controller
            return true;
          }
        }
      }
    },
    ['body']
  )
);

export const verifyForgotPasswordTokenValidator = validate(
  checkSchema(
    {
      forgot_password_token: forgot_password_tokenSchema
    },
    ['body']
  )
);

export const resetPasswordValidator = validate(
  checkSchema(
    {
      password: passwordSchema,
      confirm_password: confirmPasswordSchema,
      forgot_password_token: forgot_password_tokenSchema
    },
    ['body']
  )
);

export const verifiedUserValidator = (req: Request, res: Response, next: NextFunction) => {
  const { verify_status } = req.decoded_authorization as TokenPayload;

  if (verify_status !== UserVerifyStatus.Verified) {
    return next(
      new ErrorWithStatus({
        message: USERS_MESSAGE.USER_NOT_VERIFIED,
        status: HTTP_STATUS.FORBIDDEN
      })
    );
  }

  next();
};

export const updateMeValidator = validate(
  checkSchema(
    {
      name: {
        ...nameSchema,
        optional: true
        // notEmpty: undefined
      },
      date_of_birth: {
        ...dateOfBirthSchema,
        optional: true
      },
      bio: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGE.BIO_MUST_BE_STRING
        },
        trim: true,
        isLength: {
          options: { min: 1, max: 200 },
          errorMessage: USERS_MESSAGE.BIO_LENGTH
        }
      },

      location: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGE.LOCATION_MUST_BE_STRING
        },
        trim: true,
        isLength: {
          options: { min: 1, max: 100 },
          errorMessage: USERS_MESSAGE.LOCATION_LENGTH
        }
      },
      website: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGE.WEBSITE_MUST_BE_STRING
        },
        trim: true,
        isLength: {
          options: { min: 1, max: 100 },
          errorMessage: USERS_MESSAGE.WEBSITE_LENGTH
        }
      },
      username: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGE.USERNAME_MUST_BE_STRING
        },
        trim: true,
        custom: {
          options: async (value, { req }) => {
            if (!REGEX_USERNAME.test(value)) {
              throw new Error(USERS_MESSAGE.USERNAME_INVALID);
            }
            const existingUser = await databaseService.users.findOne({ username: value });
            if (existingUser) {
              throw new Error(USERS_MESSAGE.USERNAME_ALREADY_EXISTS);
            }
            return true;
          }
        }
      },
      avatar_url: imageSchema,
      cover_photo_url: imageSchema
    },
    ['body']
  )
);

export const followValidator = validate(
  checkSchema(
    {
      followed_user_id: followedUserSchema
    },
    ['body']
  )
);

export const unfollowValidator = validate(
  checkSchema(
    {
      followed_user_id: followedUserSchema
    },
    ['params']
  )
);

export const changePasswordValidator = validate(
  checkSchema(
    {
      old_password: {
        ...passwordSchema,
        custom: {
          options: async (value, { req }) => {
            const { user_id } = req.decoded_authorization as TokenPayload;

            const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) });

            if (!user) {
              throw new ErrorWithStatus({
                message: USERS_MESSAGE.USER_NOT_FOUND,
                status: HTTP_STATUS.NOT_FOUND
              });
            }

            if (user.password !== hashPassword(value)) {
              throw new Error(USERS_MESSAGE.OLD_PASSWORD_INCORRECT);
            }

            return true;
          }
        }
      },
      new_password: {
        ...passwordSchema,
        custom: {
          options: (value, { req }) => {
            if (value === req.body.old_password) {
              throw new Error(USERS_MESSAGE.NEW_PASSWORD_SAME_AS_OLD);
            }
            return true;
          }
        }
      },
      confirm_new_password: {
        ...confirmPasswordSchema,
        custom: {
          options: (value, { req }) => {
            if (value !== req.body.new_password) {
              throw new Error(USERS_MESSAGE.PASSWORDS_DO_NOT_MATCH);
            }
            return true;
          }
        }
      }
    },
    ['body']
  )
);

export const isUserLoggedInValidator = (middleware: (req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization) {
      return middleware(req, res, next);
    }
    next();
  };
};
