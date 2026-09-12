import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectMembersService } from './project-members.service';
import { AssignProjectMemberDto } from './dto/assign-project-member.dto';
import { OPENAPI_BEARER_SCHEME } from '../openapi/openapi.config';

/**
 * Admin-only member relations for projects (SCHEMA.md §51-53), mounted under
 * the shared `/projects` prefix. `role` stays a controlled string with
 * mandatory explicit attribution — the final enum is not locked (§52).
 */
@ApiTags('projects')
@Controller('projects')
export class ProjectMembersController {
  constructor(private readonly projectMembersService: ProjectMembersService) {}

  /** Admin: assign a collective member with an explicit role + audit `create`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Assign a collective member to a project (admin)' })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        memberId: { type: 'string' },
        role: { type: 'string' },
      },
    },
  })
  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  async assignMember(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AssignProjectMemberDto,
  ): Promise<{ projectId: string; memberId: string; role: string }> {
    return this.projectMembersService.assignMember(adminId, id, dto);
  }

  /** Admin: remove a member assignment, scoped to the project + audit `delete`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Remove a member assignment from a project (admin)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
  })
  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('memberId', new ParseUUIDPipe({ version: '4' })) memberId: string,
  ): Promise<{ message: string }> {
    return this.projectMembersService.removeMember(adminId, id, memberId);
  }
}
