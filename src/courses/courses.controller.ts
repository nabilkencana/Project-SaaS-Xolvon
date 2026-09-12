import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ListCoursesQueryDto } from './dto/list-courses-query.dto';
import { CATALOG_THROTTLE } from '../config/throttle.config';
import {
  CourseCardDto,
  CourseDetailDto,
} from './dto/course-response.dto';
import { OPENAPI_BEARER_SCHEME } from '../openapi/openapi.config';

/**
 * Course catalog + admin content management (PRD §31-33). Public reads are
 * marked @Public and strictly published-only; all mutations are admin-only
 * and audited.
 */
@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  /** Public: published courses with ?q=, ?sort=, and DL-011 pagination. */
  @Public()
  @Throttle(CATALOG_THROTTLE)
  @ApiOperation({ summary: 'List published courses' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/CourseCardDto' } },
        page: { type: 'integer' },
        limit: { type: 'integer' },
        total: { type: 'integer' },
        query: { type: 'string', nullable: true },
      },
    },
  })
  @Get()
  async listPublished(
    @Query() query: ListCoursesQueryDto,
  ): Promise<{
    items: CourseCardDto[];
    page: number;
    limit: number;
    total: number;
    query: string | null;
  }> {
    return this.coursesService.listPublished(query);
  }

  /** Public: published detail by slug with lesson summaries (no private fields). */
  @Public()
  @ApiOperation({ summary: 'Read a published course by slug' })
  @ApiOkResponse({ type: CourseDetailDto })
  @Get(':slug')
  async getPublishedBySlug(@Param('slug') slug: string): Promise<CourseDetailDto> {
    return this.coursesService.getPublishedBySlug(slug);
  }

  /** Admin: create a draft course + audit `create`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Create a draft course (admin)' })
  @ApiCreatedResponse({ type: CourseCardDto })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('sub') adminId: string,
    @Body() dto: CreateCourseDto,
  ): Promise<CourseCardDto> {
    return this.coursesService.create(adminId, dto);
  }

  /** Admin: partial update + audit `update`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Update a course (admin)' })
  @ApiOkResponse({ type: CourseCardDto })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCourseDto,
  ): Promise<CourseCardDto> {
    return this.coursesService.update(adminId, id, dto);
  }

  /** Admin: publish (draft → published, gated on required fields) + audit `publish`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Publish a draft course (admin)' })
  @ApiOkResponse({ type: CourseCardDto })
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CourseCardDto> {
    return this.coursesService.publish(adminId, id);
  }

  /** Admin: unpublish (published → draft) + audit `unpublish`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Unpublish a course back to draft (admin)' })
  @ApiOkResponse({ type: CourseCardDto })
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublish(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CourseCardDto> {
    return this.coursesService.unpublish(adminId, id);
  }
}
