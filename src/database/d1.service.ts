import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CloudflareD1Response, D1QueryResult } from './d1.types';

@Injectable()
export class D1Service implements OnModuleInit {
  private readonly logger = new Logger(D1Service.name);

  /** D1 REST API endpoint — built once in constructor, reused for every query. */
  private readonly endpointUrl: string;

  /** Bearer token for Cloudflare API authentication. */
  private readonly apiToken: string;

  /** Timeout in milliseconds for each fetch call to the D1 REST API. */
  private readonly timeoutMs = 10_000;

  constructor(private readonly config: ConfigService) {
    const accountId = this.config.get<string>('CLOUDFLARE_ACCOUNT_ID') ?? '';
    const databaseId =
      this.config.get<string>('CLOUDFLARE_D1_DATABASE_ID') ?? '';
    this.apiToken = this.config.get<string>('CLOUDFLARE_API_TOKEN') ?? '';

    this.endpointUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  }

  /**
   * Validates that all required Cloudflare credentials are present.
   * Called automatically by NestJS during module initialisation.
   * Fails fast at startup instead of waiting for the first request to fail.
   */
  onModuleInit(): void {
    const required: Record<string, string> = {
      CLOUDFLARE_ACCOUNT_ID:
        this.config.get<string>('CLOUDFLARE_ACCOUNT_ID') ?? '',
      CLOUDFLARE_D1_DATABASE_ID:
        this.config.get<string>('CLOUDFLARE_D1_DATABASE_ID') ?? '',
      CLOUDFLARE_API_TOKEN:
        this.config.get<string>('CLOUDFLARE_API_TOKEN') ?? '',
    };

    const missing = Object.entries(required)
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(
        `D1Service: missing required environment variable(s): ${missing.join(', ')}. ` +
          'Set them in your .env file or deployment environment before starting the application.',
      );
    }
  }

  /**
   * Execute a parameterised SQL query against Cloudflare D1 via REST API.
   *
   * @param sql    - SQL string with `?` placeholders for bind parameters.
   * @param params - Values bound to the `?` placeholders (prevents SQL injection).
   * @returns Parsed query result with typed rows and metadata.
   *
   * @example
   * ```ts
   * const result = await this.d1.query<User>(
   *   'SELECT * FROM users WHERE email = ?',
   *   ['farsya@xolvon.com'],
   * );
   * console.log(result.results); // User[]
   * ```
   */
  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<D1QueryResult<T>> {
    let response: Response;

    try {
      response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql, params }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error: unknown) {
      // AbortSignal.timeout() throws a TimeoutError (DOMException with name "TimeoutError")
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        this.logger.error(
          `D1 query timed out after ${this.timeoutMs}ms: ${sql}`,
        );
        throw new HttpException(
          'Database request timed out. Please try again later.',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }

      // Network errors (DNS failure, connection refused, etc.)
      this.logger.error(
        'D1 query network error',
        error instanceof Error ? error.stack : String(error),
      );
      throw new HttpException(
        'Unable to reach the database. Please try again later.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Parse the Cloudflare API JSON envelope
    let body: CloudflareD1Response<T>;
    try {
      body = (await response.json()) as CloudflareD1Response<T>;
    } catch {
      this.logger.error(
        `D1 API returned non-JSON response (HTTP ${response.status})`,
      );
      throw new HttpException(
        'Unexpected database response. Please try again later.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Cloudflare API returned an error envelope or non-2xx status
    if (!response.ok || !body.success) {
      this.logger.error('D1 API error response', {
        status: response.status,
        errors: body.errors,
        messages: body.messages,
      });
      throw new HttpException(
        'A database error occurred. Please try again later.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    // D1 always returns an array of statement results; we only send one statement.
    const statementResult = body.result[0];

    return {
      results: statementResult.results,
      meta: statementResult.meta,
    };
  }
}
