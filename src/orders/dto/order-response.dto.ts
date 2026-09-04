import type { OrderStatus } from '../interfaces/order.interface';

export class OrderItemResponseDto {
  readonly id: string;
  readonly courseId: string;
  readonly price: number;

  constructor(partial: Partial<OrderItemResponseDto>) {
    Object.assign(this, partial);
  }
}

export class OrderResponseDto {
  readonly id: string;
  readonly status: OrderStatus;
  readonly amount: number;
  readonly notes: string;
  readonly items: OrderItemResponseDto[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly verifiedAt: string | null;

  constructor(partial: Partial<OrderResponseDto>) {
    Object.assign(this, partial);
  }
}

export class OrderActivationResponseDto {
  readonly message: string;
  readonly orderId: string;
  readonly activatedCoursesCount: number;

  constructor(partial: Partial<OrderActivationResponseDto>) {
    Object.assign(this, partial);
  }
}
