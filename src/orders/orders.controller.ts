import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { ORDER_THROTTLE } from '../config/throttle.config';
import { CreateOrderDto } from './dto/create-order.dto';
import { SubmitPaymentProofDto } from './dto/submit-payment-proof.dto';
import {
  OrderActivationResponseDto,
  OrderResponseDto,
} from './dto/order-response.dto';
import { OPENAPI_BEARER_SCHEME } from '../openapi/openapi.config';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * User: Checkout new order.
   * Creates pending order and calculates total price securely on server.
   */
  @UseGuards(AuthGuard)
  @Throttle(ORDER_THROTTLE)
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Create an order for published courses' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async checkout(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.checkout(userId, dto);
  }

  /**
   * User: Submit payment proof object key for a pending order.
   * Enforces order ownership check to prevent IDOR vulnerabilities.
   */
  @UseGuards(AuthGuard)
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Submit a payment proof for an own order' })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        proofId: { type: 'string' },
      },
    },
  })
  @Post(':id/payment-proof')
  @HttpCode(HttpStatus.CREATED)
  async submitPaymentProof(
    @CurrentUser('sub') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Body() dto: SubmitPaymentProofDto,
  ): Promise<{ message: string; proofId: string }> {
    return this.ordersService.submitPaymentProof(userId, orderId, dto);
  }

  /**
   * Admin-only: Verify order payment.
   * Strictly allowed ONLY from status 'pending' → 'paid'.
   */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Verify an order payment (admin)' })
  @ApiOkResponse({ type: OrderResponseDto })
  @Patch(':id/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOrder(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.verifyOrder(adminId, orderId);
  }

  /**
   * Admin-only: Activate course enrollments from a paid order.
   * Idempotent: repeated calls do not create duplicates or errors.
   */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Activate enrollments from a paid order (admin)' })
  @ApiOkResponse({ type: OrderActivationResponseDto })
  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activateOrder(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
  ): Promise<OrderActivationResponseDto> {
    return this.ordersService.activateOrder(adminId, orderId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Cancel a pending order (admin)' })
  @ApiOkResponse({ type: OrderResponseDto })
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelOrder(adminId, orderId);
  }
}
