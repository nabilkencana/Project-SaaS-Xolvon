/**
 * `GET /admin/overview` (HANDBOOK §5.4): operational counters for the admin
 * dashboard. All three values are live COUNT queries — never cached or
 * stored.
 */
export class AdminOverviewDto {
  readonly userCount: number;
  readonly pendingOrders: number;
  readonly activeEnrollments: number;

  constructor(partial: Partial<AdminOverviewDto>) {
    Object.assign(this, partial);
  }
}
