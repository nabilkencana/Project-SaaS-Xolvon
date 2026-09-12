import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsUUID } from 'class-validator';

export class UpdateProgressDto {
  @ApiProperty({ description: 'Lesson id (UUID v4).' })
  @IsUUID('4')
  lessonId!: string;

  @ApiProperty()
  @IsBoolean()
  completed!: boolean;
}
