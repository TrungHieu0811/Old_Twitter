import { Request } from 'express';
import { File, formidable } from 'formidable';
import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR, UPLOAD_TEMP_DIR } from '~/constants/dir';

export const initFolder = () => {
  if (!fs.existsSync(UPLOAD_TEMP_DIR)) {
    fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
  }
};

export const handleUploadSingleImage = async (req: Request) => {
  const form = formidable({
    uploadDir: path.resolve(UPLOAD_TEMP_DIR),
    maxFiles: 1,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    filter: function ({ name, originalFilename, mimetype }) {
      const valid = name === 'image' && Boolean(mimetype?.includes('image/'));

      if (!valid) {
        form.emit('error', new Error('Invalid file type. Only image files are allowed.'));
      }

      return valid;
    }
  });

  return new Promise<File>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }

      // eslint-disable-next-line no-extra-boolean-cast
      if (!Boolean(files.image)) {
        return reject(new Error('No image file uploaded'));
      }

      resolve((files.image as File[])[0]);
    });
  });
};

export const getNameFromFullname = (fullname: string) => {
  const nameArr = fullname.split('.');

  nameArr.pop();

  return nameArr.join('');
};
