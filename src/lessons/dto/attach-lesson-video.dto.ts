import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AttachLessonVideoDto {
  @ApiProperty({
    description: 'Object key of the confirmed lesson video.',
    example: 'private/courses/course-uuid/lessons/lesson-uuid/video/video.mp4',
  })
  @IsString({ message: 'objectKey harus berupa teks string.' })
  @IsNotEmpty({ message: 'objectKey tidak boleh kosong.' })
  objectKey!: string;
}
