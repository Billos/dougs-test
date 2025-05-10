## Description

This project is a NestJS application that validates movements and balances.
It is done as a technical test for a job application at [Dougs](https://dougs.fr/).
It provides an endpoint to validate the movements against the balances, and can detect the following issues:

- Duplicate movements based on id
- Missing balances (at least 2 balances are required)
- If the movements provided do not match the balances
  - Giving some insights on the difference found
  - Giving the information on the movement type (withdrawal, deposit, transfer, etc.) on the missing movement
  - Giving the period of an error (except duplicate errors)
  - Trying to detect which movement matches the difference, if possible (as it could be an undetected duplicate, or an error).

Suggested improvements:

- We could try to detect more tuples of movements that match the difference, but this would require a more complex algorithm and could lead to false positives.

## Project setup

```bash
$ yarn install
```

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## HTTP queries

You can test a POST request to the /movements/validation endpoint using the following commands:

### Valid request

```bash
curl -X POST http://localhost:3000/movements/validation \
-H "Content-Type: application/json" \
-d '{
  "movements": [
    { "id": 1, "date": "2025-01-02", "label": "Deposit", "amount": 100 },
    { "id": 2, "date": "2025-01-04", "label": "Withdrawal", "amount": -50 }
  ],
  "balances": [
    { "date": "2025-01-01", "balance": 0 },
    { "date": "2025-01-03", "balance": 100 },
    { "date": "2025-01-05", "balance": 50 }
  ]
}'
```

### Invalid request with valid data

```bash
curl -X POST http://localhost:3000/movements/validation \
-H "Content-Type: application/json" \
-d '{
  "movements": [
    { "id": 1, "date": "2025-01-02", "label": "Deposit", "amount": 100 },
    { "id": 2, "date": "2025-01-04", "label": "Withdrawal", "amount": -50 }
  ],
  "balances": [
    { "date": "2025-01-01", "balance": 0 },
    { "date": "2025-01-03", "balance": 200 },
    { "date": "2025-01-05", "balance": 50 }
  ]
}'
```

### Invalid request with invalid data

```bash
curl -X POST http://localhost:3000/movements/validation \
-H "Content-Type: application/json" \
-d '{
  "movements": [
    { "id": 1, "date": "2025-01-02", "label": "Deposit", "amount": true },
    { "id": 2, "date": "2025-01-04", "label": "Withdrawal", "amount": -50 }
  ],
  "balances": [
    { "date": "2025-01-01", "balance": 0 },
    { "date": "2025-01-03", "balance": 200 },
    { "date": "2025-01-05", "balance": 50 }
  ]
}'
```

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Conclusion and thoughts

I have decided to change some things from the initial specifications.

- The movements wording was renamed as label and considered as the classic banking label, in order to avoid being confused with the movement types (withdrawal, deposit, transfer, etc.)
- I didn't add the type of movement in the movements, I considered that the computation of the movements did not require to know the type of movement, but only the amount.
- I decided not to include a type of movement as the amount usually implies the type of movement.
- I decided to add a generic "details" field to give more information on the error, rather than having a specific field for each type of error.
- When an error is encountered, the application returns a 400 status code with a message indicating the error, rather than providing the errors in a "reasons" field, I've decided to use the native "cause" of HttpExceptions.

This development was test driven, the endpoint calls were first implemented, then the validation logic was implemented, and finally the unit tests of the service were added.

This was my first real experience with NestJS, (I mean, more than just doing the basic tutorial), and I have to say that I am quite impressed by the framework, I really look forward to using it in the future.
Natural structure is very clear, the decorators are very useful
