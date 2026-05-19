import express from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema';
import { EntityError, ErrorWithStatus } from '~/models/Errors';
import { HTTP_STATUS } from '~/constants/httpStatus';

// can be reused by many routes
export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // sequential processing, stops running validations chain if one fails.
    await validation.run(req);

    const errors = validationResult(req);
    const errorObject = errors.mapped();
    const entityError = new EntityError({ errors: {} });

    for (const key in errorObject) {
      const { msg } = errorObject[key];

      if (msg instanceof ErrorWithStatus && msg.status !== HTTP_STATUS.UNPROCESSABLE_ENTITY) {
        next(msg);
        return;
      }

      entityError.errors[key] = errorObject[key];
    }

    if (!errors.isEmpty()) {
      next(entityError);
      return;
    }

    next();
  };
};
