import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { CourseResourceType } from '../interfaces/course-resource.interface';

/**
 * Admin create payload (SCHEMA.md §24-25). `type` accepts ONLY the official
 * baseline pdf|resource|assignment — anything else (quiz, certificate, …) is
 * rejected with 400 by the validation pipe.
 */
export class CreateCourseResourceDto {
  @ApiProperty({ enum: ['pdf', 'resource', 'assignment'] satisfies [CourseResourceType, ...CourseResourceType[]] })
  @IsIn(['pdf', 'resource', 'assignment'], {
    message: 'type hanya boleh salah satu dari: pdf, resource, assignment.',
  })
  type: CourseResourceType;

  @ApiProperty({ description: 'Object key of the uploaded file, max 1024 characters.', maxLength: 1024 })
  @IsString({ message: 'objectKey harus berupa teks string.' })
  @IsNotEmpty({ message: 'objectKey tidak boleh kosong.' })
  @MaxLength(1024, { message: 'objectKey maksimal 1024 karakter.' })
  objectKey: string;

  @ApiProperty({ description: 'Resource title, max 200 characters.', maxLength: 200 })
  @IsString({ message: 'title harus berupa teks string.' })
  @IsNotEmpty({ message: 'title tidak boleh kosong.' })
  @MaxLength(200, { message: 'title maksimal 200 karakter.' })
  title: string;
}
