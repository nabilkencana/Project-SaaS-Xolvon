import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';

describe('EnrollmentsController', () => {
  let controller: EnrollmentsController;
  let mockService: jest.Mocked<EnrollmentsService>;

  beforeEach(() => {
    mockService = {
      getUserEnrollments: jest.fn(),
      revokeEnrollment: jest.fn(),
      isUserEntitled: jest.fn(),
      activateOrderEnrollments: jest.fn(),
    } as unknown as jest.Mocked<EnrollmentsService>;

    controller = new EnrollmentsController(mockService);
  });

  it('should return user enrollments from getMyEnrollments', async () => {
    const mockList = [
      new EnrollmentResponseDto({
        id: 'en-1',
        courseId: 'c-1',
        status: 'active',
        grantedAt: '2026-09-04T00:00:00.000Z',
        expiresAt: null,
        createdAt: '2026-09-04T00:00:00.000Z',
      }),
    ];

    mockService.getUserEnrollments.mockResolvedValueOnce(mockList);

    const result = await controller.getMyEnrollments('user-1');

    expect(result).toBe(mockList);
    expect(mockService.getUserEnrollments).toHaveBeenCalledWith('user-1');
  });

  it('should revoke enrollment via revokeEnrollment', async () => {
    const mockRevoked = new EnrollmentResponseDto({
      id: 'en-1',
      courseId: 'c-1',
      status: 'revoked',
      grantedAt: '2026-09-04T00:00:00.000Z',
      expiresAt: null,
      createdAt: '2026-09-04T00:00:00.000Z',
    });

    mockService.revokeEnrollment.mockResolvedValueOnce(mockRevoked);

    const result = await controller.revokeEnrollment('admin-1', 'en-1');

    expect(result).toBe(mockRevoked);
    expect(mockService.revokeEnrollment).toHaveBeenCalledWith('admin-1', 'en-1');
  });
});
