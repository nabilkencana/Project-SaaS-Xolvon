import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SubmitPaymentProofDto {
  @IsString({ message: 'objectKey harus berupa teks string.' })
  @IsNotEmpty({ message: 'objectKey tidak boleh kosong.' })
  @MaxLength(1000, { message: 'objectKey maksimal 1000 karakter.' })
  objectKey: string;
}
