# E-commerce-server

## Environment

Set `REDIS_URL` to enable Redis caching, for example `redis://127.0.0.1:6379`.
Caching is disabled when `REDIS_URL` is not set, and the server continues without
caching if the configured Redis instance is  unavailable.