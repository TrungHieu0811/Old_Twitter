import { Collection, Db, MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import User from '~/models/schemas/User.schema';
import RefreshToken from '~/models/schemas/RefreshToken.schema';
import Follower from '~/models/schemas/Follower.schema';
import { VideoStatus } from '~/models/schemas/VideoStatus.Schema';
import Tweet from '~/models/schemas/Tweet.schema';
import HashTag from '~/models/schemas/HashTag.schema';
import Bookmark from '~/models/schemas/Bookmark.schema';
import Like from '~/models/schemas/Like.schema';

dotenv.config();
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@twitter.s072dad.mongodb.net/?appName=Twitter`;

class DatabaseService {
  private client: MongoClient;
  private db: Db;
  constructor() {
    this.client = new MongoClient(uri);
    this.db = this.client.db(process.env.DB_NAME);
  }

  async connect() {
    try {
      // Send a ping to confirm a successful connection
      await this.db.command({ ping: 1 });
      console.log('Pinged your deployment. You successfully connected to MongoDB!');
    } finally {
      // await this.client.close();
    }
  }

  async indexUsers() {
    const existingIndexes = await this.users.indexExists(['email_1_password_1', 'email_1', 'username_1']);
    if (!existingIndexes) {
      this.users.createIndex({ email: 1, password: 1 });
      this.users.createIndex({ email: 1 }, { unique: true });
      this.users.createIndex({ username: 1 }, { unique: true });
    }
  }

  async indexRefreshTokens() {
    const existingIndexes = await this.refreshTokens.indexExists(['token_1', 'exp_1']);
    if (!existingIndexes) {
      this.refreshTokens.createIndex({ token: 1 }, { unique: true });
      this.refreshTokens.createIndex({ exp: 1 }, { expireAfterSeconds: 0 });
    }
  }

  async indexVideoStatus() {
    const existingIndexes = await this.videoStatus.indexExists(['name_1']);
    if (!existingIndexes) {
      this.videoStatus.createIndex({ name: 1 }, { unique: true });
    }
  }

  async indexFollowers() {
    const existingIndexes = await this.followers.indexExists(['user_id_1_followed_user_id_1']);
    if (!existingIndexes) {
      this.followers.createIndex({ user_id: 1, followed_user_id: 1 }, { unique: true });
    }
  }

  get users(): Collection<User> {
    return this.db.collection(process.env.DB_USER_COLLECTION as string);
  }

  get refreshTokens(): Collection<RefreshToken> {
    return this.db.collection(process.env.DB_REFRESH_TOKEN_COLLECTION as string);
  }

  get followers(): Collection<Follower> {
    return this.db.collection(process.env.DB_FOLLOWER_COLLECTION as string);
  }

  get videoStatus(): Collection<VideoStatus> {
    return this.db.collection(process.env.DB_VIDEO_STATUS_COLLECTION as string);
  }

  get tweets(): Collection<Tweet> {
    return this.db.collection(process.env.DB_TWEET_COLLECTION as string);
  }

  get hashtags(): Collection<HashTag> {
    return this.db.collection(process.env.DB_HASHTAG_COLLECTION as string);
  }

  get bookmarks(): Collection<Bookmark> {
    return this.db.collection(process.env.DB_BOOKMARK_COLLECTION as string);
  }

  get likes(): Collection<Like> {
    return this.db.collection(process.env.DB_LIKE_COLLECTION as string);
  }
}

// Create object instance of DatabaseService
const databaseService = new DatabaseService();

export default databaseService;
