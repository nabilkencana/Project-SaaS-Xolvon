import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { SEARCH_THROTTLE } from '../config/throttle.config';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResponseDto, SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @ApiOperation({ summary: 'Search published courses, projects, and marketplace items' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['course', 'project', 'marketplace'],
              },
              id: { type: 'string' },
              title: { type: 'string' },
              slug: { type: 'string' },
              description: { type: 'string', nullable: true },
              status: { type: 'string', enum: ['published'] },
            },
          },
        },
        query: { type: 'string' },
        page: { type: 'integer' },
        limit: { type: 'integer' },
        total: { type: 'integer' },
      },
    },
  })
  @Throttle(SEARCH_THROTTLE)
  @Get()
  search(@Query() query: SearchQueryDto): Promise<SearchResponseDto> {
    return this.searchService.search(query);
  }
}
