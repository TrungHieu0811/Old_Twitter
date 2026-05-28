import { NextFunction, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { TokenPayload } from '~/models/requests/User.requests';
import BookmarkRequestBody from '~/models/requests/Bookmark.request';
import bookmarksService from '~/services/bookmarks.services';
import { BOOKMARKS_MESSAGE } from '~/constants/messages';

export const bookmarkTweetController = async (
  req: Request<ParamsDictionary, any, BookmarkRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  const result = await bookmarksService.bookmarkTweet(user_id, req.body.tweet_id);

  res.json({
    message: BOOKMARKS_MESSAGE.BOOKMARK_SUCCESS,
    result
  });
  return;
};

export const unbookmarkTweetController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  const result = await bookmarksService.unbookmarkTweet(user_id, req.params.tweet_id);

  res.json({
    message: BOOKMARKS_MESSAGE.UNBOOKMARK_SUCCESS,
    result
  });
  return;
};

export const unbookmarkTweetByBookmarkIdController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  const result = await bookmarksService.unbookmarkTweetByBookmarkId(user_id, req.params.bookmark_id);

  res.json({
    message: BOOKMARKS_MESSAGE.UNBOOKMARK_SUCCESS,
    result
  });
  return;
};
