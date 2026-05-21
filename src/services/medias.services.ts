import { Request } from 'express';
import sharp from 'sharp';
import { UPLOAD_DIR } from '~/constants/dir';
import { getNameFromFullname, handleUploadSingleImage } from '~/utils/file';
import fs from 'fs';

class MediasService {
  async uploadSingleImage(req: Request) {
    const file = await handleUploadSingleImage(req);

    const newName = getNameFromFullname(file.newFilename);

    const newPath = `${UPLOAD_DIR}/${newName}.jpeg`;

    await sharp(file.filepath).jpeg().toFile(newPath);

    fs.unlinkSync(file.filepath);

    return `http://localhost:4000/medias/${newName}.jpeg`;
  }
}

const mediasService = new MediasService();

export default mediasService;
