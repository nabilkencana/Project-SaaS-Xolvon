import type { OrderRow } from '../interfaces/order.interface';
import type { OrderItemRow } from '../interfaces/order-item.interface';
import {
  OrderItemResponseDto,
  OrderResponseDto,
} from '../dto/order-response.dto';

export function toOrderItemResponse(row: OrderItemRow): OrderItemResponseDto {
  return new OrderItemResponseDto({
    id: row.id,
    courseId: row.course_id,
    price: row.price,
  });
}

export function toOrderResponse(
  order: OrderRow,
  items: OrderItemRow[] = [],
): OrderResponseDto {
  return new OrderResponseDto({
    id: order.id,
    status: order.status,
    amount: order.amount,
    notes: order.notes ?? '',
    items: items.map(toOrderItemResponse),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    verifiedAt: order.verified_at,
  });
}
