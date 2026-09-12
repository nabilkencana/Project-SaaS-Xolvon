import { ApiProperty } from '@nestjs/swagger';
import type { OrderStatus } from '../interfaces/order.interface';

export class OrderItemResponseDto {
  @ApiProperty({ description: 'Order item id (UUID v4).' })
  readonly id: string;

  @ApiProperty({ description: 'Course id (UUID v4).' })
  readonly courseId: string;

  @ApiProperty({ description: 'Item price in IDR (server-computed).' })
  readonly price: number;

  constructor(partial: Partial<OrderItemResponseDto>) {
    Object.assign(this, partial);
  }
}

export class OrderResponseDto {
  @ApiProperty({ description: 'Order id (UUID v4).' })
  readonly id: string;

  @ApiProperty({ enum: ['pending', 'paid', 'cancelled'] satisfies [OrderStatus, ...OrderStatus[]] })
  readonly status: OrderStatus;

  @ApiProperty({ description: 'Total amount in IDR (server-computed).' })
  readonly amount: number;

  @ApiProperty()
  readonly notes: string;

  @ApiProperty({ type: () => [OrderItemResponseDto] })
  readonly items: OrderItemResponseDto[];

  @ApiProperty({ description: 'ISO 8601 timestamp.' })
  readonly createdAt: string;

  @ApiProperty({ description: 'ISO 8601 timestamp.' })
  readonly updatedAt: string;

  @ApiProperty({ type: String, nullable: true, description: 'ISO 8601 timestamp, null until verified.' })
  readonly verifiedAt: string | null;

  constructor(partial: Partial<OrderResponseDto>) {
    Object.assign(this, partial);
  }
}

export class OrderActivationResponseDto {
  @ApiProperty()
  readonly message: string;

  @ApiProperty({ description: 'Order id (UUID v4).' })
  readonly orderId: string;

  @ApiProperty({ description: 'Number of enrollments activated by the call.' })
  readonly activatedCoursesCount: number;

  constructor(partial: Partial<OrderActivationResponseDto>) {
    Object.assign(this, partial);
  }
}
