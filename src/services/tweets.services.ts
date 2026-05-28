import { TweetRequestBody } from '~/models/requests/Tweet.requests';
import databaseService from './database.services';
import Tweet from '~/models/schemas/Tweet.schema';
import { ObjectId, WithId } from 'mongodb';
import HashTag from '~/models/schemas/HashTag.schema';

class TweetsService {
  async checkAndCreateHashtags(hashtags: string[]) {
    const hashtagDocs = await Promise.all(
      hashtags.map((hashtag) => {
        return databaseService.hashtags.findOneAndUpdate(
          { name: hashtag },
          { $setOnInsert: new HashTag({ name: hashtag }) },
          { upsert: true, returnDocument: 'after' }
        );
      })
    );
    return hashtagDocs.map((hashtag) => {
      if (!hashtag) {
        throw new Error('Hashtag not found');
      }

      return hashtag._id;
    });
  }

  async createTweet(user_id: string, body: TweetRequestBody) {
    const hashtags = await this.checkAndCreateHashtags(body.hashtags);

    const result = await databaseService.tweets.insertOne(
      new Tweet({
        audience: body.audience,
        content: body.content,
        hashtags: hashtags,
        mentions: body.mentions,
        medias: body.medias,
        parent_id: body.parent_id,
        type: body.type,
        user_id: new ObjectId(user_id)
      })
    );

    const tweet = await databaseService.tweets.findOne({ _id: result.insertedId });

    if (!tweet) {
      throw new Error('Tweet not found');
    }
    return tweet;
  }

  async increaseViews(tweet_id: string, user_id?: string) {
    const inc = user_id ? { user_views: 1 } : { guest_views: 1 };

    const result = await databaseService.tweets.findOneAndUpdate(
      { _id: new ObjectId(tweet_id) },
      { $inc: inc, $currentDate: { updated_at: true } },
      { returnDocument: 'after', projection: { guest_views: 1, user_views: 1 } }
    );

    return result;
  }
}

const tweetsService = new TweetsService();

export default tweetsService;
