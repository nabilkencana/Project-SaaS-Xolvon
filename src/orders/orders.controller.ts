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
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { SubmitPaymentProofDto } from './dto/submit-payment-proof.dto';
import type {
  OrderActivationResponseDto,
  OrderResponseDto,
} from './dto/order-response.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * User: Checkout new order.
   * Creates pending order and calculates total price securely on server.
   */
  @UseGuards(AuthGuard)
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
  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activateOrder(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
  ): Promise<OrderActivationResponseDto> {
    return this.ordersService.activateOrder(adminId, orderId);
  }
}
