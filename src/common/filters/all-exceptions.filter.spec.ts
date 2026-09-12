import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let jsonResponse: { status: jest.Mock; json: jest.Mock };
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    jsonResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const request = { method: 'GET', url: '/api/test?token=secret-query-token', path: '/api/test' };
    host = {
      switchToHttp: () =>
        ({
          getResponse: () => jsonResponse,
          getRequest: () => request,
        }) as any,
    } as unknown as ArgumentsHost;
  });

  function capturedBody(): Record<string, unknown> {
    expect(jsonResponse.json).toHaveBeenCalledTimes(1);
    return jsonResponse.json.mock.calls[0][0] as Record<string, unknown>;
  }

  it('preserves status and message for an HttpException with a string response', () => {
    filter.catch(
      new HttpException('Something specific failed', HttpStatus.BAD_REQUEST),
      host,
    );

    expect(jsonResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const body = capturedBody();
    expect(body['statusCode']).toBe(HttpStatus.BAD_REQUEST);
    expect(body['message']).toBe('Something specific failed');
    expect(body['error']).toBe('BAD_REQUEST');
    expect(body['path']).toBe('/api/test');
    expect(typeof body['timestamp']).toBe('string');
  });

  it('does not expose query-string secrets in the response or log path', () => {
    filter.catch(new Error('secret internal detail'), host);

    expect(JSON.stringify(capturedBody())).not.toContain('secret-query-token');
  });

  it('preserves structured message arrays from validation errors', () => {
    const validationResponse = {
      statusCode: 400,
      message: ['name must be a string', 'email must be an email'],
      error: 'Bad Request',
    };
    filter.catch(new HttpException(validationResponse, 400), host);

    const body = capturedBody();
    expect(body['statusCode']).toBe(400);
    expect(body['message']).toEqual(validationResponse.message);
    expect(body['error']).toBe('Bad Request');
  });

  it('sanitizes unknown errors to a generic 500 without internals', () => {
    const internalError = new Error(
      'DB password p@ssw0rd leaked in connection string',
    );

    filter.catch(internalError, host);

    expect(jsonResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    const body = capturedBody();
    expect(body['statusCode']).toBe(500);
    expect(body['message']).toBe(
      'An unexpected error occurred. Please try again later.',
    );
    expect(body['error']).toBe('Internal Server Error');
    expect(JSON.stringify(body)).not.toContain('p@ssw0rd');
  });

  it('sanitizes non-Error throwables to a generic 500', () => {
    filter.catch('a random string was thrown', host);

    expect(jsonResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    const body = capturedBody();
    expect(body['message']).toBe(
      'An unexpected error occurred. Please try again later.',
    );
    expect(JSON.stringify(body)).not.toContain('a random string was thrown');
  });

  it('does not leak stack traces for unknown errors', () => {
    const error = new Error('secret internal detail');
    error.stack = 'Error: secret internal detail\n    at fake (file.ts:1:1)';

    filter.catch(error, host);

    expect(JSON.stringify(capturedBody())).not.toContain('secret internal detail');
  });
});
