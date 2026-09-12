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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { CATALOG_THROTTLE } from '../config/throttle.config';
import { ProjectCardDto } from './dto/project-card.dto';
import { ProjectDetailDto } from './dto/project-detail.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { OPENAPI_BEARER_SCHEME } from '../openapi/openapi.config';

/**
 * Portfolio (PRD §26-30): public published-only reads and admin content
 * management. The detail response follows the founder-mandated story order
 * Problem→Solution→Tech Stack→Result→Media→"Built by" (SCHEMA.md §48); media
 * ordering lives in the service query (`sort_order`), members carry explicit
 * roles from the project_members ⋈ collective_members join.
 */
@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /** Public: published projects with ?q= (title/summary contains) and DL-011 pagination. */
  @Public()
  @Throttle(CATALOG_THROTTLE)
  @ApiOperation({ summary: 'List published projects' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/ProjectCardDto' },
        },
        page: { type: 'integer' },
        limit: { type: 'integer' },
        total: { type: 'integer' },
      },
    },
  })
  @Get()
  async listPublished(
    @Query() query: ListProjectsQueryDto,
  ): Promise<{
    items: ProjectCardDto[];
    page: number;
    limit: number;
    total: number;
  }> {
    return this.projectsService.listPublished(query);
  }

  /** Public: published detail by slug — draft and unknown slugs both 404. */
  @Public()
  @ApiOperation({ summary: 'Read a published project by slug' })
  @ApiOkResponse({ type: ProjectDetailDto })
  @Get(':slug')
  async getPublishedDetailBySlug(
    @Param('slug') slug: string,
  ): Promise<ProjectDetailDto> {
    return this.projectsService.getPublishedDetailBySlug(slug);
  }

  /** Admin: create a draft project + audit `create`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Create a project (admin)' })
  @ApiCreatedResponse({ type: ProjectResponseDto })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProject(
    @CurrentUser('sub') adminId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.createProject(adminId, dto);
  }

  /** Admin: partial update + audit `update`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Update a project (admin)' })
  @ApiOkResponse({ type: ProjectResponseDto })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateProject(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.updateProject(adminId, id, dto);
  }

  /** Admin: publish (draft → published, gated on required fields) + audit `publish`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Publish a project (admin)' })
  @ApiOkResponse({ type: ProjectResponseDto })
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publishProject(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.publishProject(adminId, id);
  }

  /** Admin: unpublish (published → draft) + audit `unpublish`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Unpublish a project (admin)' })
  @ApiOkResponse({ type: ProjectResponseDto })
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublishProject(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.unpublishProject(adminId, id);
  }
}
