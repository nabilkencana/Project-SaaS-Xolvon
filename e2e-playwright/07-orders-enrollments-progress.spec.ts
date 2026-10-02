import { test, expect } from '@playwright/test';
import { getAdminAccessToken } from './helpers/auth';

test.describe('07. Orders, Enrollments & Progress Surface', () => {
  const ts = Date.now();
  let adminAccessToken: string;
  let studentAccessToken: string;
  let courseId: string;
  let lessonId: string;
  let orderId: string;
  let order2Id: string;
  let proofObjectKey: string;
  let enrollmentId: string;

  test.beforeAll(async ({ request }) => {
    // 1. Admin login
    adminAccessToken = await getAdminAccessToken(request);

    // 2. Student register & login
    const studentEmail = `student.orders.${ts}@example.com`;
    const studentPassword = 'StudentPass123!';
    await request.post('auth/register', {
      data: {
        email: studentEmail,
        phone: `+6283${String(ts).slice(-8)}`,
        password: studentPassword,
        name: 'Student Tester',
      },
    });
    const studentLoginRes = await request.post('auth/login', {
      data: { email: studentEmail, password: studentPassword },
    });
    const studentLoginBody = await studentLoginRes.json();
    studentAccessToken = studentLoginBody.accessToken;

    // 3. Create course & publish
    const courseRes = await request.post('courses', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        title: `Purchasable Course ${ts}`,
        slug: `purchasable-course-${ts}`,
        description: 'Course created for order flow testing.',
        price: 300000,
      },
    });
    const courseBody = await courseRes.json();
    courseId = courseBody.id;
    await request.post(`courses/${courseId}/publish`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });

    // 4. Create lesson in course
    const lessonRes = await request.post(`courses/${courseId}/lessons`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        title: `Course Lesson ${ts}`,
        orderIndex: 1,
      },
    });
    const lessonBody = await lessonRes.json();
    lessonId = lessonBody.id;
    await request.post(`lessons/${lessonId}/publish`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
  });

  test('POST /api/orders (Student create order / checkout)', async ({ request }) => {
    const res = await request.post('orders', {
      headers: { Authorization: `Bearer ${studentAccessToken}` },
      data: {
        courseIds: [courseId],
        notes: 'Testing order checkout via Playwright.',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body.status).toBe('pending');
    orderId = body.id;
  });

  test('GET /api/orders/me (Student query own orders - anti-IDOR)', async ({ request }) => {
    const res = await request.get('orders/me', {
      headers: { Authorization: `Bearer ${studentAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((o: { id: string }) => o.id === orderId)).toBe(true);
  });

  test('GET /api/orders/:id (Student query single order by ID)', async ({ request }) => {
    const res = await request.get(`orders/${orderId}`, {
      headers: { Authorization: `Bearer ${studentAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(orderId);
    expect(body.status).toBe('pending');
  });

  test('POST /api/orders/:id/payment-proof-url (Request upload URL for payment proof)', async ({ request }) => {
    const res = await request.post(`orders/${orderId}/payment-proof-url`, {
      headers: { Authorization: `Bearer ${studentAccessToken}` },
      data: {
        contentType: 'image/png',
        size: 2048,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('uploadUrl');
    expect(body).toHaveProperty('key');
    proofObjectKey = body.key;
  });

  test('POST /api/orders/:id/payment-proof (Student submit payment proof)', async ({ request }) => {
    const res = await request.post(`orders/${orderId}/payment-proof`, {
      headers: { Authorization: `Bearer ${studentAccessToken}` },
      data: {
        objectKey: proofObjectKey,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('proofId');
  });

  test('PATCH /api/orders/:id/verify (Admin verify order payment)', async ({ request }) => {
    const res = await request.patch(`orders/${orderId}/verify`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('paid');
  });

  test('POST /api/orders/:id/activate (Admin activate order and grant enrollment)', async ({ request }) => {
    const res = await request.post(`orders/${orderId}/activate`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('berhasil');
  });

  test('GET /api/enrollments/me (Student query active enrollments)', async ({ request }) => {
    const res = await request.get('enrollments/me', {
      headers: { Authorization: `Bearer ${studentAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    const enrollment = body.find((e: { course_id?: string; courseId?: string }) => (e.course_id || e.courseId) === courseId);
    expect(enrollment).toBeDefined();
    enrollmentId = enrollment.id;
  });

  test('POST /api/progress (Student record lesson progress)', async ({ request }) => {
    const res = await request.post('progress', {
      headers: { Authorization: `Bearer ${studentAccessToken}` },
      data: {
        lessonId: lessonId,
        completed: true,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.completed).toBe(true);
  });

  test('GET /api/progress (Student fetch course progress)', async ({ request }) => {
    const res = await request.get('progress', {
      headers: { Authorization: `Bearer ${studentAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('PATCH /api/enrollments/:id/revoke (Admin revoke enrollment)', async ({ request }) => {
    const res = await request.patch(`enrollments/${enrollmentId}/revoke`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('revoked');
  });

  test('POST /api/orders/:id/cancel (Admin cancel order)', async ({ request }) => {
    // 1. Create second order to cancel
    const newOrderRes = await request.post('orders', {
      headers: { Authorization: `Bearer ${studentAccessToken}` },
      data: {
        courseIds: [courseId],
      },
    });
    const newOrderBody = await newOrderRes.json();
    order2Id = newOrderBody.id;

    // 2. Admin cancel order
    const cancelRes = await request.post(`orders/${order2Id}/cancel`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        reason: 'Payment expired.',
      },
    });
    expect(cancelRes.status()).toBe(200);
    const cancelBody = await cancelRes.json();
    expect(cancelBody.status).toBe('cancelled');
  });
});
