import { Router } from 'express';
import { unbookmarkTweetByBookmarkIdController } from '~/controllers/bookmarks.controllers';
import {
  likeTweetController,
  unlikeTweetByLikeIdController,
  unlikeTweetController
} from '~/controllers/likes.controllers';
import { tweetIdValidator } from '~/middlewares/tweet.middlewares';
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const likeRouter = Router();

likeRouter.post(
  '/',
  accessTokenValidator,
  verifiedUserValidator,
  tweetIdValidator,
  wrapRequestHandler(likeTweetController)
);
likeRouter.delete(
  '/tweets/:tweet_id',
  accessTokenValidator,
  verifiedUserValidator,
  tweetIdValidator,
  wrapRequestHandler(unlikeTweetController)
);
likeRouter.delete(
  '/:like_id',
  accessTokenValidator,
  verifiedUserValidator,
  tweetIdValidator,
  wrapRequestHandler(unlikeTweetByLikeIdController)
);
export default likeRouter;
