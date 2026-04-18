import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Clinic = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user.clinicId;
  },
);
