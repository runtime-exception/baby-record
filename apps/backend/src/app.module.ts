import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { PrismaModule } from './prisma/prisma.module';
import { BabyModule } from './modules/baby/baby.module';
import { UserModule } from './modules/user/user.module';
import { FeedingModule } from './modules/feeding/feeding.module';
import { DiaperModule } from './modules/diaper/diaper.module';
import { SleepModule } from './modules/sleep/sleep.module';
import { SupplementModule } from './modules/supplement/supplement.module';
import { ActivityModule } from './modules/activity/activity.module';
import { TemperatureModule } from './modules/temperature/temperature.module';
import { RecordModule } from './modules/record/record.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { IntervalModule } from './modules/interval/interval.module';
import { ChartModule } from './modules/chart/chart.module';
import { AuthModule } from './modules/auth/auth.module';
import { GrowthModule } from './modules/growth/growth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    PrismaModule,
    AuthModule,
    // 基础
    BabyModule,
    UserModule,
    // 记录域
    FeedingModule,
    DiaperModule,
    SleepModule,
    SupplementModule,
    ActivityModule,
    TemperatureModule,
    GrowthModule,
    // 聚合层
    RecordModule,
    StatisticsModule,
    DashboardModule,
    IntervalModule,
    ChartModule,
  ],
})
export class AppModule {}
