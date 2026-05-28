import { ObjectId } from 'mongodb';
import { UserVerifyStatus } from '~/constants/enums';

interface UserType {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  date_of_birth: Date;
  created_at?: Date;
  updated_at?: Date;
  email_verify_token?: string;
  forgot_password_token?: string;
  verify_status?: UserVerifyStatus;
  twitter_circle?: ObjectId[];

  bio?: string;
  location?: string;
  website?: string;
  username?: string;
  avatar_url?: string;
  cover_photo_url?: string;
}

export default class User {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  date_of_birth: Date;
  created_at: Date;
  updated_at: Date;
  email_verify_token: string;
  forgot_password_token: string;
  verify_status: UserVerifyStatus;
  twitter_circle?: ObjectId[];

  bio: string;
  location: string;
  website: string;
  username: string;
  avatar_url: string;
  cover_photo_url: string;

  constructor(user: UserType) {
    this._id = user._id;
    this.name = user.name || '';
    this.email = user.email;
    this.password = user.password;
    this.date_of_birth = user.date_of_birth || new Date();
    this.created_at = user.created_at || new Date();
    this.updated_at = user.updated_at || new Date();
    this.email_verify_token = user.email_verify_token || '';
    this.forgot_password_token = user.forgot_password_token || '';
    this.verify_status = user.verify_status || UserVerifyStatus.Unverified;
    this.twitter_circle = user.twitter_circle || [];

    this.bio = user.bio || '';
    this.location = user.location || '';
    this.website = user.website || '';
    this.username = user.username || '';
    this.avatar_url = user.avatar_url || '';
    this.cover_photo_url = user.cover_photo_url || '';
  }
}
