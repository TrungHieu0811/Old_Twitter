import { ObjectId } from 'mongodb';

interface RefreshTokenType {
  _id?: ObjectId;
  user_id: ObjectId;
  token: string;
  created_at?: Date;
  iat: number;
  exp: number;
}

export default class RefreshToken {
  _id?: ObjectId;
  user_id: ObjectId;
  token: string;
  created_at: Date;
  iat: Date;
  exp: Date;

  constructor({ _id, user_id, token, created_at, iat, exp }: RefreshTokenType) {
    this._id = _id;
    this.user_id = user_id;
    this.token = token;
    this.created_at = created_at || new Date();
    this.iat = new Date(iat * 1000);
    this.exp = new Date(exp * 1000);
  }
}
