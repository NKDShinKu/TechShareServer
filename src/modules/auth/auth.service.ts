import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../../entities/user.entity';
import { AuthRefreshToken } from '../../entities/auth-refresh-token.entity';
import { UserSetting } from '../../entities/user-setting.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(AuthRefreshToken)
    private refreshTokenRepository: Repository<AuthRefreshToken>,
    @InjectRepository(UserSetting)
    private userSettingRepository: Repository<UserSetting>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, email, password, nickname } = registerDto;

    // 检查用户名是否已存在
    const existingUser = await this.usersRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictException('用户名已存在');
      }
      if (existingUser.email === email) {
        throw new ConflictException('邮箱已被注册');
      }
    }

    // 加密密码
    const password_hash = await bcrypt.hash(password, 10);

    // 创建用户
    const user = this.usersRepository.create({
      username,
      email,
      password_hash,
      nickname: nickname || username,
      last_login_at: new Date(),
    });

    await this.usersRepository.save(user);

    // 创建用户设置
    const userSetting = this.userSettingRepository.create({
      user_id: user.id,
    });
    await this.userSettingRepository.save(userSetting);

    // 生成 token
    return this.generateTokens(user);
  }

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // 查找用户（支持用户名或邮箱登录）
    const user = await this.usersRepository.findOne({
      where: [{ username }, { email: username }],
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 检查用户状态
    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('账户已被封禁');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 更新最后登录时间
    user.last_login_at = new Date();
    await this.usersRepository.save(user);

    // 生成 token
    return this.generateTokens(user);
  }

  async refreshToken(refreshToken: string) {
    // 查找 refresh token
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, revoked: false },
      relations: ['user'],
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('无效的 refresh token');
    }

    // 检查是否过期
    if (new Date() > tokenRecord.expires_at) {
      throw new UnauthorizedException('Refresh token 已过期');
    }

    // 检查用户状态
    if (tokenRecord.user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('账户已被封禁');
    }

    // 撤销旧的 refresh token
    tokenRecord.revoked = true;
    await this.refreshTokenRepository.save(tokenRecord);

    // 生成新的 token
    return this.generateTokens(tokenRecord.user);
  }

  async validateToken(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user || user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('无效的用户');
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // 撤销指定的 refresh token
      await this.refreshTokenRepository.update(
        { token: refreshToken, user_id: userId },
        { revoked: true },
      );
    } else {
      // 撤销该用户的所有 refresh token
      await this.refreshTokenRepository.update(
        { user_id: userId },
        { revoked: true },
      );
    }

    return { message: '登出成功' };
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    // 生成 access token
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN'),
    });

    // 生成 refresh token
    const refreshTokenValue = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    // 计算 refresh token 过期时间
    const expiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN');
    const expiresAt = new Date();
    const days = parseInt(expiresIn.replace('d', ''));
    expiresAt.setDate(expiresAt.getDate() + days);

    // 保存 refresh token
    const refreshToken = this.refreshTokenRepository.create({
      user_id: user.id,
      token: refreshTokenValue,
      expires_at: expiresAt,
    });
    await this.refreshTokenRepository.save(refreshToken);

    // 获取用户信息（不包含密码）
    const { password_hash, ...userInfo } = user;

    return {
      token: accessToken,
      refreshToken: refreshTokenValue,
      userInfo,
      role: user.role,
    };
  }
}

