# T3 Learning

The request-integrity check belongs in an `APP_GUARD`, alongside throttling, so it runs for every HTTP route without changing JWT bearer authentication or adding cookie-session behavior. Mutation checks are limited to POST, PATCH, and DELETE; service clients with bearer authorization and no browser metadata remain allowed to continue to the existing auth guard. GET requests are intentionally unaffected.
