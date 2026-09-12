import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import {
  OrderActivationResponseDto,
  OrderResponseDto,
} from './dto/order-response.dto';

describe('OrdersController', () => {
  let controller: OrdersController;
  let mockOrdersService: jest.Mocked<OrdersService>;

  beforeEach(() => {
    mockOrdersService = {
      checkout: jest.fn(),
      submitPaymentProof: jest.fn(),
      verifyOrder: jest.fn(),
      activateOrder: jest.fn(),
      cancelOrder: jest.fn(),
    } as unknown as jest.Mocked<OrdersService>;

    controller = new OrdersController(mockOrdersService);
  });

  it('should call checkout on service', async () => {
    const mockResponse = new OrderResponseDto({
      id: 'ord-1',
      status: 'pending',
      amount: 100000,
      notes: '',
      items: [],
      createdAt: '2026-09-04T00:00:00.000Z',
      updatedAt: '2026-09-04T00:00:00.000Z',
      verifiedAt: null,
    });

    mockOrdersService.checkout.mockResolvedValueOnce(mockResponse);

    const dto = {
      courseIds: ['c-1'],
    };

    const result = await controller.checkout('user-1', dto);

    expect(result).toBe(mockResponse);
    expect(mockOrdersService.checkout).toHaveBeenCalledWith('user-1', dto);
  });

  it('should call submitPaymentProof on service', async () => {
    const mockResponse = {
      message: 'Bukti pembayaran berhasil diunggah.',
      proofId: 'proof-1',
    };

    mockOrdersService.submitPaymentProof.mockResolvedValueOnce(mockResponse);

    const dto = { objectKey: 'proofs/1.jpg' };
    const result = await controller.submitPaymentProof('user-1', 'ord-1', dto);

    expect(result).toBe(mockResponse);
    expect(mockOrdersService.submitPaymentProof).toHaveBeenCalledWith(
      'user-1',
      'ord-1',
      dto,
    );
  });

  it('should call verifyOrder on service', async () => {
    const mockResponse = new OrderResponseDto({
      id: 'ord-1',
      status: 'paid',
      amount: 100000,
      notes: '',
      items: [],
      createdAt: '2026-09-04T00:00:00.000Z',
      updatedAt: '2026-09-04T00:00:00.000Z',
      verifiedAt: '2026-09-04T00:00:00.000Z',
    });

    mockOrdersService.verifyOrder.mockResolvedValueOnce(mockResponse);

    const result = await controller.verifyOrder('admin-1', 'ord-1');

    expect(result).toBe(mockResponse);
    expect(mockOrdersService.verifyOrder).toHaveBeenCalledWith('admin-1', 'ord-1');
  });

  it('should call activateOrder on service', async () => {
    const mockResponse = new OrderActivationResponseDto({
      message: 'Enrollment berhasil diaktivasi.',
      orderId: 'ord-1',
      activatedCoursesCount: 1,
    });

    mockOrdersService.activateOrder.mockResolvedValueOnce(mockResponse);

    const result = await controller.activateOrder('admin-1', 'ord-1');

    expect(result).toBe(mockResponse);
    expect(mockOrdersService.activateOrder).toHaveBeenCalledWith('admin-1', 'ord-1');
  });

  it('should call cancelOrder on service', async () => {
    const mockResponse = new OrderResponseDto({
      id: 'ord-1',
      status: 'cancelled',
      amount: 100000,
      notes: '',
      items: [],
      createdAt: '2026-09-04T00:00:00.000Z',
      updatedAt: '2026-09-04T00:00:00.000Z',
      verifiedAt: null,
    });

    mockOrdersService.cancelOrder.mockResolvedValueOnce(mockResponse);

    const result = await controller.cancelOrder('admin-1', 'ord-1');

    expect(result).toBe(mockResponse);
    expect(mockOrdersService.cancelOrder).toHaveBeenCalledWith('admin-1', 'ord-1');
  });
});
