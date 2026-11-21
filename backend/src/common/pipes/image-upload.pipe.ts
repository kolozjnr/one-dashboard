import { ParseFilePipeBuilder } from '@nestjs/common';

/** Use for user/workspace brand image uploads; Nest also checks the file bytes. */
export function createImageUploadPipe(): ReturnType<ParseFilePipeBuilder['build']> {
  return new ParseFilePipeBuilder()
    .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
    .addFileTypeValidator({ fileType: /^image\/(png|jpeg|webp)$/ })
    .build({ fileIsRequired: true });
}
