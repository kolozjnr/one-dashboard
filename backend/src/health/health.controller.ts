import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../modules/auth/public.decorator';

@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check API and safe dependency health status' })
  @ApiOkResponse({ description: 'Application status and dependency availability' })
  getHealth() {
    return this.health.getStatus();
  }
}
