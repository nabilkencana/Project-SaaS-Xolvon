import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SubmitPaymentProofDto {
  @ApiProperty({ description: 'Object key of the uploaded payment proof, max 1000 characters.', maxLength: 1000 })
  @IsString({ message: 'objectKey harus berupa teks string.' })
  @IsNotEmpty({ message: 'objectKey tidak boleh kosong.' })
  @MaxLength(1000, { message: 'objectKey maksimal 1000 karakter.' })
  objectKey: string;
}
