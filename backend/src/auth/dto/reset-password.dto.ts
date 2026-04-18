import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { Match } from '../decorators/match.decorator';

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  newPassword: string;

  @IsNotEmpty()
  @IsString()
  @Match('newPassword', { message: 'Passwords do not match' })
  confirmNewPassword: string;
}
