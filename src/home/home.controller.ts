import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HomeResponseDTO } from './home.dto';
import { CATALOG_THROTTLE } from '../config/throttle.config';
import { HomeService } from './home.service';

/**
 * Public home aggregation (plan T10). Deliberately registers no auth guard:
 * GET /home is a public endpoint and the app has no global guard, so the
 * route is reachable without any Authorization header.
 */
@ApiTags('home')
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @ApiOperation({ summary: 'Read the public home page aggregation' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        courses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              slug: { type: 'string' },
              description: { type: 'string', nullable: true },
              price: { type: 'integer' },
              thumbnailUrl: { type: 'string', nullable: true },
            },
          },
        },
        projects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              slug: { type: 'string' },
              summary: { type: 'string', nullable: true },
            },
          },
        },
        marketplace: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              slug: { type: 'string' },
              description: { type: 'string', nullable: true },
              externalUrl: { type: 'string' },
            },
          },
        },
        collective: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
              photo: { type: 'string', nullable: true },
              role: { type: 'string', nullable: true },
              skills: { type: 'array', items: { type: 'string' } },
              socialLinks: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  })
  @Throttle(CATALOG_THROTTLE)
  @Get()
  getHome(): Promise<HomeResponseDTO> {
    return this.homeService.getHome();
  }
}
