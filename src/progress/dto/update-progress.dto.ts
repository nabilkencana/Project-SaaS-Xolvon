import { IsBoolean, IsUUID } from 'class-validator';

export class UpdateProgressDto {
  @IsUUID('4')
  lessonId!: string;

  @IsBoolean()
  completed!: boolean;
}
