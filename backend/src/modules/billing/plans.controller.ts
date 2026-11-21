import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { PlansService } from './plans.service';

// Public plan catalog for the pricing page. Plan rows — including every limit — come
// from the database; clients can never influence what is offered here.
@ApiTags('plans')
@Controller('plans')
@Public()
@UseGuards(PermissionsGuard)
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  catalog() { return this.plans.catalog(); }
}
