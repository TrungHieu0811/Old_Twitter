import { NextFunction, Request, RequestHandler, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR, UPLOAD_VIDEO_TEMP_DIR } from '~/constants/dir';
import { HTTP_STATUS } from '~/constants/httpStatus';
import { USERS_MESSAGE } from '~/constants/messages';
import mediasService from '~/services/medias.services';

export const uploadImageController: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const url = await mediasService.uploadImage(req);

  res.json({
    message: USERS_MESSAGE.UPLOAD_SUCCESS,
    result: url
  });

  return;
};

export const uploadVideoController: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const url = await mediasService.uploadVideo(req);

  res.json({
    message: USERS_MESSAGE.UPLOAD_SUCCESS,
    result: url
  });

  return;
};

export const serveImageController: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.params;

  res.sendFile(path.resolve(UPLOAD_IMAGE_DIR, name), (err) => {
    if (err) {
      res.status((err as any).status).send('Not found');
    }
  });

  return;
};

const getContentType = (filePath: string) => {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.mp4':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.webm':
      return 'video/webm';
    case '.avi':
      return 'video/x-msvideo';
    default:
      return 'application/octet-stream';
  }
};

export const serveVideoStreamController = (req: Request, res: Response, next: NextFunction) => {
  const range = req.headers.range;

  if (!range) {
    res.status(HTTP_STATUS.BAD_REQUEST).send('Requires Range header');
    return;
  }

  const { name } = req.params;

  const videoPath = path.resolve(UPLOAD_VIDEO_DIR, name);

  const videoSize = fs.statSync(videoPath).size;

  //Video stream chunking for streaming large video files
  const CHUNK_SIZE = 10 ** 6; // 1MB

  // Get the start and end of the chunk to be sent
  const start = Number(range.replace(/\D/g, ''));

  // if exceeds the video size, get videoSize
  const end = Math.min(start + CHUNK_SIZE - 1, videoSize - 1);

  //The real content length of the chunk
  // Ususally will be ChUNK_SIZE  except for the last chunk which will be less than CHUNK_SIZE
  const contentLength = end - start + 1;

  // const constentType = mime.getType(videoPath) || 'video/*';

  const contentType = getContentType(videoPath);

  const header = {
    'Content-Type': contentType,
    'Content-Length': contentLength,
    'Content-Range': `bytes ${start}-${end}/${videoSize}`,
    'Accept-Ranges': 'bytes'
  };

  res.writeHead(HTTP_STATUS.PARTIAL_CONTENT, header);

  const videoStream = fs.createReadStream(videoPath, { start, end });

  videoStream.pipe(res);

  return;
};

export const uploadVideoHLSController: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const url = await mediasService.uploadVideoHLS(req);

  res.json({
    message: USERS_MESSAGE.UPLOAD_SUCCESS,
    result: url
  });

  return;
};

export const serveM3u8Controller: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const videoPath = path.resolve(UPLOAD_VIDEO_DIR, id, 'master.m3u8');

  res.sendFile(videoPath, (err) => {
    if (err) {
      res.status((err as any).status).send('Not found');
    }
  });

  return;
};

export const serveSegmentController: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const { id, v, segment } = req.params;

  const videoPath = path.resolve(UPLOAD_VIDEO_DIR, id, v, segment);

  res.sendFile(videoPath, (err) => {
    if (err) {
      res.status((err as any).status).send('Not found');
    }
  });

  return;
};

export const videoStatusController: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const videoStatus = await mediasService.getVideoStatus(id);

  if (!videoStatus) {
    res.status(HTTP_STATUS.NOT_FOUND).send('Not found');
    return;
  }

  res.json({
    message: USERS_MESSAGE.GET_VIDEO_STATUS_SUCCESS,
    result: videoStatus
  });
  return;
};
