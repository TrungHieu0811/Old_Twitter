import { Request } from 'express';
import { File, formidable } from 'formidable';
import fs from 'fs';
import path from 'path';
import { UPLOAD_IMAGE_DIR, UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR, UPLOAD_VIDEO_TEMP_DIR } from '~/constants/dir';

export const initFolder = () => {
  [UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_TEMP_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

export const handleUploadVideo = async (req: Request) => {
  const nanoid = (await import('nanoid')).nanoid;
  const idName = nanoid();
  const folderPath = path.resolve(UPLOAD_VIDEO_DIR, idName);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const form = formidable({
    uploadDir: path.resolve(UPLOAD_VIDEO_DIR, idName),
    maxFiles: 1,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxTotalFileSize: 50 * 1024 * 1024, // 50MB
    filter: function ({ name, originalFilename, mimetype }) {
      const valid = name === 'video' && Boolean(mimetype?.includes('mp4') || mimetype?.includes('quicktime'));

      if (!valid) {
        form.emit('error', new Error('Invalid file type. Only mp4 and mov video files are allowed.'));
      }

      return valid;
    },
    filename: function () {
      return idName;
    }
  });

  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }

      // eslint-disable-next-line no-extra-boolean-cast
      if (!Boolean(files.video)) {
        return reject(new Error('No video file uploaded'));
      }

      const videos = files.video as File[];

      videos.forEach((video) => {
        const ext = getExtension(video.originalFilename as string);

        fs.renameSync(video.filepath, video.filepath + '.' + ext);

        video.filepath = video.filepath + '.' + ext;
        video.newFilename = video.newFilename + '.' + ext;
      });

      resolve(files.video as File[]);
    });
  });
};

export const handleUploadImage = async (req: Request) => {
  const form = formidable({
    uploadDir: path.resolve(UPLOAD_IMAGE_TEMP_DIR),
    maxFiles: 4,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxTotalFileSize: 5 * 1024 * 1024 * 4, // 20MB
    filter: function ({ name, originalFilename, mimetype }) {
      const valid = name === 'image' && Boolean(mimetype?.includes('image/'));

      if (!valid) {
        form.emit('error', new Error('Invalid file type. Only image files are allowed.'));
      }

      return valid;
    }
  });

  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }

      // eslint-disable-next-line no-extra-boolean-cast
      if (!Boolean(files.image)) {
        return reject(new Error('No image file uploaded'));
      }

      resolve(files.image as File[]);
    });
  });
};

export const getNameFromFullname = (fullname: string) => {
  const nameArr = fullname.split('.');

  nameArr.pop();

  return nameArr.join('');
};

export const getExtension = (fullname: string) => {
  const nameArr = fullname.split('.');
  return nameArr[nameArr.length - 1];
};
