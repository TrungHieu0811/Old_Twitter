import { NextFunction, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { TokenPayload } from '~/models/requests/User.requests';
import BookmarkRequestBody from '~/models/requests/Bookmark.request';
import bookmarksService from '~/services/bookmarks.services';
import { BOOKMARKS_MESSAGE, LIKES_MESSAGE } from '~/constants/messages';
import LikeRequestBody from '~/models/requests/Like.request';
import likesService from '~/services/likes.services';

export const likeTweetController = async (
  req: Request<ParamsDictionary, any, LikeRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  const result = await likesService.likeTweet(user_id, req.body.tweet_id);

  res.json({
    message: LIKES_MESSAGE.LIKE_SUCCESS,
    result
  });
  return;
};

export const unlikeTweetController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  const result = await likesService.unlikeTweet(user_id, req.params.tweet_id);

  res.json({
    message: LIKES_MESSAGE.UNLIKE_SUCCESS,
    result
  });
  return;
};

export const unlikeTweetByLikeIdController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  const result = await likesService.unlikeTweetByLikeId(user_id, req.params.like_id);

  res.json({
    message: LIKES_MESSAGE.UNLIKE_SUCCESS,
    result
  });
  return;
};
