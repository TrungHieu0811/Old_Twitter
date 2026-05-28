import { NextFunction, Request, Response } from 'express';
import { TweetRequestBody } from '~/models/requests/Tweet.requests';
import { ParamsDictionary } from 'express-serve-static-core';
import tweetsService from '~/services/tweets.services';
import { TokenPayload } from '~/models/requests/User.requests';

export const createTweetController = async (
  req: Request<ParamsDictionary, any, TweetRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  const result = await tweetsService.createTweet(user_id, req.body);

  res.json({
    message: 'Tweet created successfully',
    result
  });
  return;
};

export const getTweetController = async (req: Request<ParamsDictionary>, res: Response, next: NextFunction) => {
  const { tweet_id } = req.params;

  const result = await tweetsService.increaseViews(tweet_id, req.decoded_authorization?.user_id);

  const tweet = {
    ...req.tweet,
    guest_views: result?.guest_views,
    user_views: result?.user_views
  };

  res.json({
    message: 'Tweet retrieved successfully',
    result: tweet
  });
  return;
};
