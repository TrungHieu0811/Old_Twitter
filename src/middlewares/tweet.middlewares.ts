import { NextFunction, Request, Response } from 'express';
import { checkSchema } from 'express-validator';
import { isEmpty } from 'lodash';
import { ObjectId } from 'mongodb';
import { MediaType, TweetAudience, TweetType, UserVerifyStatus } from '~/constants/enums';
import { HTTP_STATUS } from '~/constants/httpStatus';
import { TWEETS_MESSAGE } from '~/constants/messages';
import { ErrorWithStatus } from '~/models/Errors';
import { TokenPayload } from '~/models/requests/User.requests';
import Tweet from '~/models/schemas/Tweet.schema';
import databaseService from '~/services/database.services';
import { numberEnumtoArray } from '~/utils/commons';
import { validate } from '~/utils/validation';
import { wrapRequestHandler } from '~/utils/handlers';

const tweetTypes = numberEnumtoArray(TweetType);
const tweetAudiences = numberEnumtoArray(TweetAudience);
const mediaTypes = numberEnumtoArray(MediaType);

export const createTweetValidator = validate(
  checkSchema(
    {
      type: {
        isIn: {
          options: [tweetTypes],
          errorMessage: TWEETS_MESSAGE.INVALID_TWEET_TYPE
        }
      },
      audience: {
        isIn: {
          options: [tweetAudiences],
          errorMessage: TWEETS_MESSAGE.INVALID_TWEET_AUDIENCE
        }
      },
      parent_id: {
        custom: {
          options: (value, { req }) => {
            const type = req.body.type;

            if (
              [TweetType.Comment, TweetType.QuoteTweet, TweetType.Retweet].includes(type) &&
              !ObjectId.isValid(value)
            ) {
              throw new Error(TWEETS_MESSAGE.PARENT_ID_MUST_BE_A_VALID_ID);
            }

            if (type === TweetType.Tweet && value !== null) {
              throw new Error(TWEETS_MESSAGE.PARENT_ID_MUST_BE_NULL);
            }
            return true;
          }
        }
      },

      content: {
        isString: true,
        custom: {
          options: (value, { req }) => {
            const type = req.body.type;
            const hagtags = req.body.hashtags as string[];
            const mentions = req.body.mentions as string[];

            if (
              [TweetType.Comment, TweetType.QuoteTweet, TweetType.Comment].includes(type) &&
              isEmpty(hagtags) &&
              isEmpty(mentions) &&
              value == ''
            ) {
              throw new Error(TWEETS_MESSAGE.CONTENT_MUST_BE_A_NON_EMPTY_STRING);
            }

            if (type === TweetType.Retweet && value !== '') {
              throw new Error(TWEETS_MESSAGE.CONTENT_MUST_BE_EMPTY_STRING);
            }

            return true;
          }
        }
      },

      hashtags: {
        isArray: true,
        custom: {
          options: (value, { req }) => {
            if (!value.every((item: any) => typeof item === 'string')) {
              throw new Error(TWEETS_MESSAGE.HASHTAGS_MUST_BE_STRING_ARRAY);
            }
            return true;
          }
        }
      },

      mentions: {
        isArray: true,
        custom: {
          options: (value, { req }) => {
            if (!value.every((item: any) => ObjectId.isValid(item))) {
              throw new Error(TWEETS_MESSAGE.MENTIONS_MUST_BE_VALID_IDS);
            }
            return true;
          }
        }
      },

      medias: {
        isArray: true,
        custom: {
          options: (value, { req }) => {
            if (
              !value.every((item: any) => {
                return typeof item.url === 'string' && mediaTypes.includes(item.type);
              })
            ) {
              throw new Error(TWEETS_MESSAGE.MEDIAS_MUST_BE_AN_ARRAY_OF_MEDIA_OBJECTS);
            }
            return true;
          }
        }
      }
    },
    ['body']
  )
);

export const tweetIdValidator = validate(
  checkSchema(
    {
      tweet_id: {
        custom: {
          options: async (value, { req }) => {
            if (!ObjectId.isValid(value)) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.BAD_REQUEST,
                message: TWEETS_MESSAGE.INVALID_TWEET_ID
              });
            }

            const [tweet] = await databaseService.tweets
              .aggregate<Tweet>([
                {
                  $match: {
                    _id: new ObjectId(value)
                  }
                },
                {
                  $lookup: {
                    from: 'hashtags',
                    localField: 'hashtags',
                    foreignField: '_id',
                    as: 'hashtags'
                  }
                },
                {
                  $lookup: {
                    from: 'users',
                    localField: 'mentions',
                    foreignField: '_id',
                    as: 'mentions'
                  }
                },
                {
                  $addFields: {
                    mentions: {
                      $map: {
                        input: '$mentions',
                        as: 'mention',
                        in: {
                          _id: '$$mention._id',
                          name: '$$mention.name',
                          username: '$$mention.username',
                          email: '$$mention.email'
                        }
                      }
                    }
                  }
                },
                {
                  $lookup: {
                    from: 'bookmarks',
                    localField: '_id',
                    foreignField: 'tweet_id',
                    as: 'bookmarks'
                  }
                },
                {
                  $lookup: {
                    from: 'likes',
                    localField: '_id',
                    foreignField: 'tweet_id',
                    as: 'likes'
                  }
                },
                {
                  $lookup: {
                    from: 'tweets',
                    localField: '_id',
                    foreignField: 'parent_id',
                    as: 'tweet_children'
                  }
                },
                {
                  $addFields: {
                    bookmark: {
                      $size: '$bookmarks'
                    },
                    likes: {
                      $size: '$likes'
                    },
                    retweet_count: {
                      $size: {
                        $filter: {
                          input: '$tweet_children',
                          as: 'item',
                          cond: {
                            $eq: ['$$item.type', 1]
                          }
                        }
                      }
                    },
                    comment_count: {
                      $size: {
                        $filter: {
                          input: '$tweet_children',
                          as: 'item',
                          cond: {
                            $eq: ['$$item.type', 2]
                          }
                        }
                      }
                    },
                    quote_count: {
                      $size: {
                        $filter: {
                          input: '$tweet_children',
                          as: 'item',
                          cond: {
                            $eq: ['$$item.type', 3]
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $project: {
                    tweet_children: 0
                  }
                }
              ])
              .toArray();
            if (!tweet) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.NOT_FOUND,
                message: TWEETS_MESSAGE.NOT_FOUND_TWEET
              });
            }

            // (req as Request & { tweet: Tweet }).tweet = tweet;
            (req as Request).tweet = tweet;
            return true;
          }
        }
      }
    },
    ['params', 'body']
  )
);

export const audienceValidator = wrapRequestHandler(async (req: Request, res: Response, next: NextFunction) => {
  const tweet = req.tweet as Tweet;

  if (tweet.audience === TweetAudience.TwitterCircle) {
    if (!req.decoded_authorization) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: TWEETS_MESSAGE.UNAUTHORIZED
      });
    }

    const author = await databaseService.users.findOne({ _id: tweet.user_id });

    if (!author || author.verify_status == UserVerifyStatus.Banned) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: TWEETS_MESSAGE.TWEET_AUTHOR_NOT_FOUND
      });
    }

    const { user_id } = req.decoded_authorization as TokenPayload;

    const isInTwitterCircle = author.twitter_circle?.some((user_circle_id) => user_circle_id.equals(user_id)) || false;

    if (!isInTwitterCircle && !author._id.equals(user_id)) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: TWEETS_MESSAGE.USER_NOT_IN_TWITTER_CIRCLE
      });
    }
  }

  next();
});
