import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get('DB_HOST'),
  port: configService.get('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  // 支持通过 TYPEORM_SYNCHRONIZE 显式控制是否自动同步数据库结构，优先级高于 NODE_ENV
  synchronize:
    configService.get('TYPEORM_SYNCHRONIZE') !== undefined
      ? configService.get('TYPEORM_SYNCHRONIZE') === 'true'
      : configService.get('NODE_ENV') === 'development', // 生产环境应该设为 false
  logging:
    configService.get('TYPEORM_LOGGING') !== undefined
      ? configService.get('TYPEORM_LOGGING') === 'true'
      : configService.get('NODE_ENV') === 'development',
  charset: 'utf8mb4',
  timezone: '+00:00', // UTC
});

