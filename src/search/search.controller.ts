import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { SEARCH_THROTTLE } from '../config/throttle.config';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResponseDto, SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Throttle(SEARCH_THROTTLE)
  @Get()
  search(@Query() query: SearchQueryDto): Promise<SearchResponseDto> {
    return this.searchService.search(query);
  }
}
