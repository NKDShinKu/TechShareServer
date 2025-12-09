import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // 对于公开接口，尝试验证 token（如果存在），但不强制要求
      return super.canActivate(context);
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // 检查是否是公开接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 如果是公开接口，即使没有 token 或 token 无效，也允许访问（user 为 undefined）
    if (isPublic) {
      return user; // 可能是 undefined，这是允许的
    }

    // 非公开接口，必须有有效的 user
    if (err || !user) {
      throw err || new UnauthorizedException('未授权访问');
    }
    return user;
  }
}

